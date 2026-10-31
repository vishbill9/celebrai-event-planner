// Express application: security headers, CORS, rate limits, API routes, and the built React client.
import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cors from 'cors';
import express, { type ErrorRequestHandler, type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { getConfig } from './config.js';
import { HttpError } from './errors.js';
import { logger } from './logger.js';
import { chat } from './lib/ollama.js';
import { defaultAuthDeps, requireAuth, type AuthDeps } from './middleware/auth.js';
import { aiRouter, type Llm } from './routes/ai.js';
import { budgetRouter } from './routes/budget.js';
import { eventsRouter } from './routes/events.js';
import { guestsRouter } from './routes/guests.js';
import { healthRouter } from './routes/health.js';

export interface AppDeps {
  auth?: AuthDeps;
  llm?: Llm;
}

const limited = (message: string) => ({ error: { code: 'rate_limited', message } });

export function createApp(deps: AppDeps = {}): Express {
  const cfg = getConfig();
  const app = express();
  const auth = requireAuth(deps.auth ?? defaultAuthDeps());
  const llm: Llm = deps.llm ?? { chat };

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render sits behind one proxy; this makes rate limiting use the real client IP.

  // HTTPS: Render terminates TLS. Send any plain-HTTP request to the secure URL.
  if (cfg.isProd) {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] === 'http' && req.path !== '/api/health' && req.headers.host) {
        return res.redirect(308, 'https://' + req.headers.host + req.originalUrl);
      }
      next();
    });
  }

  app.use(pinoHttp({ logger, autoLogging: { ignore: req => req.url === '/api/health' } }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", ...(cfg.supabase.url ? [cfg.supabase.url] : [])],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      strictTransportSecurity: cfg.isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );
  app.use(compression());

  app.use(
    '/api',
    cors({
      origin: (origin, cb) => cb(null, !origin || cfg.corsOrigins.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use('/api', express.json({ limit: '100kb' }));
  app.use(
    '/api',
    rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, message: limited('Too many requests. Please slow down.') }),
  );

  // Public routes.
  app.use('/api', healthRouter());

  // Everything below needs a signed-in user. AI calls get a stricter limit because they are slow and costly.
  const aiLimit = rateLimit({ windowMs: 10 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: limited('You have asked the AI a lot just now. Please wait a few minutes.') });
  app.use('/api/events/:id/plan', aiLimit);
  app.use('/api/events/:id/invitation', aiLimit);
  app.use('/api/events/:id/creative', aiLimit);
  app.use('/api/events', auth, eventsRouter());
  app.use('/api', auth, guestsRouter(), budgetRouter(), aiRouter(llm));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'That API route does not exist.', 'not_found')));

  // The built React client (single-service deployment). Missing in API-only development.
  const indexHtml = path.join(cfg.clientDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use('/assets', express.static(path.join(cfg.clientDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
    app.use(express.static(cfg.clientDir, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache').sendFile(indexHtml);
    });
  }

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    if (res.headersSent) return;
    if (err instanceof HttpError) {
      if (err.status >= 500) req.log.error({ code: err.code }, err.message);
      res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
      return;
    }
    if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'invalid_json', message: 'The request body is not valid JSON.' } });
      return;
    }
    if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'too_large', message: 'That request is too large.' } });
      return;
    }
    req.log.error({ err }, 'unhandled error');
    res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } });
  };
  app.use(onError);

  return app;
}
