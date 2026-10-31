// Small helpers shared by the routes: async wrapper, validation and database error mapping.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { z as zod } from 'zod';
import { HttpError } from '../errors.js';
import { logger } from '../logger.js';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Express 4 does not catch rejected promises; this forwards them to the error handler. */
export function wrap(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Validate untrusted input and turn failures into a 400 with field-level details. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new HttpError(
    400,
    'Please check the highlighted fields.',
    'validation_error',
    result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
  );
}

export const idSchema = zod.string().uuid('Invalid id');

/** Convert a Supabase/PostgREST error into a safe HttpError (details go to the logs only). */
export function dbError(error: { code?: string; message?: string }): HttpError {
  logger.error({ dbCode: error.code, dbMessage: error.message }, 'database error');
  if (error.code === '22P02') return new HttpError(400, 'That id is not valid.', 'validation_error');
  if (error.code === '42501') return new HttpError(403, 'You do not have access to that.', 'forbidden');
  if (error.code === '23503') return new HttpError(404, 'That item was not found.', 'not_found');
  return new HttpError(500, 'Something went wrong while saving your data. Please try again.', 'database_error');
}

export function notFound(what: string): HttpError {
  return new HttpError(404, what + ' was not found.', 'not_found');
}
