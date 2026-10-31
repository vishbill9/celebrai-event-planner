// The browser gets its Supabase settings from the server (/api/config), so nothing is baked into the bundle.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (!client) {
    client = fetch('/api/config')
      .then(r => r.json())
      .then((cfg: { configured: boolean; supabaseUrl: string; supabaseAnonKey: string }) => {
        if (!cfg.configured) throw new Error('The server has no Supabase settings yet.');
        return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true },
        });
      })
      .catch(err => {
        client = null;
        throw err;
      });
  }
  return client;
}
