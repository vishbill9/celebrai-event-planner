// GET /api/health: liveness plus coarse dependency status. It never returns secrets, URLs or keys.
import { Router } from 'express';
import { getConfig } from '../config.js';
import { adminClient } from '../lib/supabase.js';
import { probe } from '../lib/ollama.js';
import { wrap } from '../lib/http.js';

const VERSION = '1.0.0';

async function databaseStatus(): Promise<'ok' | 'error' | 'not_configured'> {
  const admin = adminClient();
  if (!admin) return 'not_configured';
  try {
    const { error } = await admin.from('events').select('id', { head: true, count: 'exact' }).limit(1).abortSignal(AbortSignal.timeout(5000));
    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

export function healthRouter(): Router {
  const r = Router();

  r.get('/health', wrap(async (req, res) => {
    const cfg = getConfig();
    const database = await databaseStatus();
    const checks: Record<string, string | boolean> = {
      database,
      ai: cfg.ollama.apiKey ? 'configured' : 'not_configured',
    };
    // ?deep=1 makes one real call to the AI service (slower; for manual checks).
    if (req.query.deep === '1' && cfg.ollama.apiKey) {
      const ai = await probe();
      checks.aiReachable = ai.reachable;
      checks.aiModelAvailable = ai.modelAvailable;
      checks.aiBackupModelAvailable = ai.fallbackAvailable;
    }
    res.set('Cache-Control', 'no-store').json({
      status: database === 'error' ? 'degraded' : 'ok',
      version: VERSION,
      environment: cfg.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    });
  }));

  // Public runtime config for the browser. The anon key is public by design; row level security protects the data.
  r.get('/config', (_req, res) => {
    const { supabase } = getConfig();
    res.set('Cache-Control', 'no-store').json({
      configured: Boolean(supabase.url && supabase.anonKey),
      supabaseUrl: supabase.url,
      supabaseAnonKey: supabase.anonKey,
    });
  });

  return r;
}
