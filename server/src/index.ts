// Entry point: start the HTTP server, log missing configuration by name, and shut down cleanly.
import { createApp } from './app.js';
import { getConfig, missingConfig } from './config.js';
import { logger } from './logger.js';

const cfg = getConfig();
const missing = missingConfig(cfg);
if (missing.length > 0) logger.warn({ missing }, 'Some environment variables are not set; related features are disabled');

const server = createApp().listen(cfg.port, () => {
  logger.info({ port: cfg.port, env: cfg.nodeEnv }, 'CelebrAI is listening');
});

// Render's proxy keeps connections open for a while; stay above its timeout to avoid sporadic 502s.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', reason => logger.error({ reason: String(reason) }, 'Unhandled promise rejection'));
process.on('uncaughtException', err => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
