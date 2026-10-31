// Bearer-token authentication backed by Supabase Auth.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../errors.js';
import { anonClient, userClient } from '../lib/supabase.js';

export interface AuthContext {
  userId: string;
  email: string | null;
  /** Supabase client acting as this user (row level security applies). */
  db: SupabaseClient;
}

export interface AuthDeps {
  verify(token: string): Promise<{ id: string; email: string | null } | null>;
  userDb(token: string): SupabaseClient;
}

export function defaultAuthDeps(): AuthDeps {
  return {
    async verify(token) {
      const client = anonClient();
      if (!client) throw new HttpError(503, 'Sign-in is not configured on the server yet.', 'auth_not_configured');
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? null };
    },
    userDb: userClient,
  };
}

export function requireAuth(deps: AuthDeps): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '');
      if (!match) throw new HttpError(401, 'Please sign in to continue.', 'unauthorized');
      const token = match[1].trim();
      const user = await deps.verify(token);
      if (!user) throw new HttpError(401, 'Your session has expired. Please sign in again.', 'unauthorized');
      const ctx: AuthContext = { userId: user.id, email: user.email, db: deps.userDb(token) };
      res.locals.auth = ctx;
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function authOf(res: Response): AuthContext {
  return res.locals.auth as AuthContext;
}
