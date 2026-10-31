// Client for Ollama Cloud (GLM-5.3, with Nemotron Super 3 and beam:cloud as backups). The API key is read here and never leaves the server.
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
 * One-shot chat completion. Tries the main model, then each backup model in order.
 * If all fail, the main model's error is raised. We never fabricate an answer.
 */
export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const { ollama } = getConfig();
  if (!ollama.apiKey) throw new AiError('The AI service is not configured yet.', 'ai_not_configured');
  try {
    return await ask(ollama.model, messages, opts);
  } catch (first) {
    let last: unknown = first;
    for (const backup of ollama.fallbackModels) {
      if (backup === ollama.model) continue;
      if (opts.signal?.aborted) break;
      logger.warn({ failed: ollama.model, backup, code: (last as AiError).code }, 'AI model failed, trying backup model');
      try {
        return await ask(backup, messages, opts);
      } catch (e) {
        last = e;
      }
    }
    if (ollama.fallbackModels.length) logger.error({ code: (last as AiError).code }, 'AI backup models failed too');
    throw first;
  }
}

/** Cheap reachability check for /api/health?deep=1. Reports booleans only, never details. */
export async function probe(): Promise<{ reachable: boolean; modelAvailable: boolean; backups: Record<string, boolean> }> {
  const { ollama } = getConfig();
  if (!ollama.apiKey) return { reachable: false, modelAvailable: false, backups: {} };
  try {
    const res = await fetch(ollama.baseUrl + '/api/tags', {
      headers: { Authorization: 'Bearer ' + ollama.apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { reachable: false, modelAvailable: false, backups: {} };
    const names = (((await res.json()) as { models?: { name: string }[] }).models ?? []).map(m => m.name);
    const wanted = candidateModels(ollama.model);
    const backups: Record<string, boolean> = {};
    for (const b of ollama.fallbackModels) backups[b] = names.some(n => candidateModels(b).includes(n));
    return { reachable: true, modelAvailable: names.some(n => wanted.includes(n)), backups };
  } catch {
    return { reachable: false, modelAvailable: false, backups: {} };
  }
}
