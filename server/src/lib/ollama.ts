// Client for Ollama Cloud (GLM-5.3, with Nemotron Super 3 as the backup model). The API key is read here and never leaves the server.
// If the AI fails we raise an honest error. We never fabricate an answer.
import { getConfig } from '../config.js';
import { AiError } from '../errors.js';
import { logger } from '../logger.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  json?: boolean;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** Models to try in order: the configured name, then the same name with the ":cloud" suffix. */
export function candidateModels(model: string): string[] {
  return model.includes(':') ? [model] : [model, model + ':cloud'];
}

/** Remove any reasoning blocks some models emit before the real answer. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/** Ask one model (trying its ":cloud" alias if the plain name is not found). Throws AiError on any failure. */
async function ask(model: string, messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  const { ollama } = getConfig();
  for (const name of candidateModels(model)) {
    const timeout = AbortSignal.timeout(ollama.timeoutMs);
    let res: Response;
    try {
      res = await fetch(ollama.baseUrl + '/api/chat', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + ollama.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: name,
          messages,
          stream: false,
          ...(opts.json ? { format: 'json' } : {}),
          options: { temperature: 0.6, num_predict: opts.maxTokens ?? 3000 },
        }),
        signal: opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout,
      });
    } catch (e) {
      const n = (e as Error).name;
      if (n === 'TimeoutError' || n === 'AbortError') {
        throw new AiError('The AI took too long to answer. Please try again.', 'ai_timeout', 504);
      }
      throw new AiError('The AI service could not be reached. Please try again.', 'ai_unreachable');
    }
    if (res.status === 404) continue; // model name not found: try the next candidate
    if (!res.ok) throw new AiError('The AI service returned an error (' + res.status + '). Please try again.', 'ai_error');
    const body = (await res.json()) as { message?: { content?: string } };
    const out = stripThinking(body.message?.content ?? '');
    if (!out) throw new AiError('The AI returned an empty answer. Please try again.', 'ai_empty');
    return out;
  }
  throw new AiError('The configured AI model was not found.', 'ai_model_missing');
}

/**
 * One-shot chat completion. Tries the main model; if it fails, tries the backup model once.
 * If both fail, the main model's error is raised. We never fabricate an answer.
 */
export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const { ollama } = getConfig();
  if (!ollama.apiKey) throw new AiError('The AI service is not configured yet.', 'ai_not_configured');
  try {
    return await ask(ollama.model, messages, opts);
  } catch (first) {
    const backup = ollama.fallbackModel;
    if (!backup || backup === ollama.model || opts.signal?.aborted) throw first;
    logger.warn({ model: ollama.model, backup, code: (first as AiError).code }, 'AI main model failed, trying backup model');
    try {
      return await ask(backup, messages, opts);
    } catch (second) {
      logger.error({ backup, code: (second as AiError).code }, 'AI backup model failed too');
      throw first;
    }
  }
}

/** Cheap reachability check for /api/health?deep=1. Reports booleans only, never details. */
export async function probe(): Promise<{ reachable: boolean; modelAvailable: boolean; fallbackAvailable: boolean }> {
  const { ollama } = getConfig();
  if (!ollama.apiKey) return { reachable: false, modelAvailable: false, fallbackAvailable: false };
  try {
    const res = await fetch(ollama.baseUrl + '/api/tags', {
      headers: { Authorization: 'Bearer ' + ollama.apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { reachable: false, modelAvailable: false, fallbackAvailable: false };
    const names = (((await res.json()) as { models?: { name: string }[] }).models ?? []).map(m => m.name);
    const wanted = candidateModels(ollama.model);
    const backup = ollama.fallbackModel ? candidateModels(ollama.fallbackModel) : [];
    return { reachable: true, modelAvailable: names.some(n => wanted.includes(n)), fallbackAvailable: names.some(n => backup.includes(n)) };
  } catch {
    return { reachable: false, modelAvailable: false, fallbackAvailable: false };
  }
}
