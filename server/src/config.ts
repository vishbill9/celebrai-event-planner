// Central, typed configuration. Everything comes from environment variables; nothing is hard-coded.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Treat empty values and obvious placeholders as "not set". */
function clean(value: string | undefined): string {
  const v = (value ?? '').trim();
  return /^(paste_|your_|changeme)/i.test(v) ? '' : v;
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export interface Config {
  nodeEnv: string;
  isProd: boolean;
  port: number;
  ollama: { apiKey: string; baseUrl: string; model: string; timeoutMs: number };
  supabase: { url: string; anonKey: string; serviceRoleKey: string };
  frontendUrl: string;
  corsOrigins: string[];
  clientDir: string;
}

/** Read configuration at call time so tests and hosts can change the environment. */
export function getConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const frontendUrl = trimSlash(clean(env.FRONTEND_URL));
  const corsRaw = clean(env.CORS_ORIGIN) || frontendUrl;
  return {
    nodeEnv: env.NODE_ENV || 'development',
    isProd: env.NODE_ENV === 'production',
    port: Number(env.PORT) || 8080,
    ollama: {
      apiKey: clean(env.OLLAMA_API_KEY),
      baseUrl: trimSlash(clean(env.OLLAMA_BASE_URL) || 'https://ollama.com'),
      model: clean(env.OLLAMA_MODEL) || 'glm-5.3',
      timeoutMs: Number(env.OLLAMA_TIMEOUT_MS) || 60_000,
    },
    supabase: {
      url: trimSlash(clean(env.SUPABASE_URL)),
      anonKey: clean(env.SUPABASE_ANON_KEY),
      serviceRoleKey: clean(env.SUPABASE_SERVICE_ROLE_KEY),
    },
    frontendUrl,
    corsOrigins: corsRaw.split(',').map(s => trimSlash(s.trim())).filter(Boolean),
    clientDir: env.CLIENT_DIR ? path.resolve(env.CLIENT_DIR) : path.resolve(here, '../../client/dist'),
  };
}

/** Names (never values) of required variables that are missing. */
export function missingConfig(cfg: Config): string[] {
  const missing: string[] = [];
  if (!cfg.ollama.apiKey) missing.push('OLLAMA_API_KEY');
  if (!cfg.supabase.url) missing.push('SUPABASE_URL');
  if (!cfg.supabase.anonKey) missing.push('SUPABASE_ANON_KEY');
  if (!cfg.supabase.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}
