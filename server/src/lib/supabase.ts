// Supabase clients. The service-role client is secret and used only for server-side checks.
// Normal data access goes through a per-request client carrying the user's token, so
// Postgres row level security decides what each user can see.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from '../config.js';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

let admin: SupabaseClient | null | undefined;
let anon: SupabaseClient | null | undefined;

/** Service-role client (bypasses RLS). Returns null when not configured. */
export function adminClient(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const { url, serviceRoleKey } = getConfig().supabase;
  admin = url && serviceRoleKey ? createClient(url, serviceRoleKey, options) : null;
  return admin;
}

/** Anonymous client, used only to validate a user's access token. */
export function anonClient(): SupabaseClient | null {
  if (anon !== undefined) return anon;
  const { url, anonKey } = getConfig().supabase;
  anon = url && anonKey ? createClient(url, anonKey, options) : null;
  return anon;
}

/** A client that acts as the signed-in user, so row level security applies. */
export function userClient(token: string): SupabaseClient {
  const { url, anonKey } = getConfig().supabase;
  return createClient(url, anonKey, { ...options, global: { headers: { Authorization: 'Bearer ' + token } } });
}

/** Forget cached clients (used by tests when the environment changes). */
export function resetClients(): void {
  admin = undefined;
  anon = undefined;
}
