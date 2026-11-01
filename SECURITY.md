# Security

## Reporting a problem

Please open a private security advisory on this repository (Security tab -> Report a vulnerability) instead of a public issue. Do not include real user data.

## What is protected, and how

| Area | Control |
|---|---|
| Secrets | `OLLAMA_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` live only in server environment variables. `.env` files are git-ignored; `.env.example` has names only. Logs never contain secrets. |
| Authentication | Supabase Auth (email and Google). Every private API route requires a valid Bearer token. |
| Authorization | Each request uses a Supabase client acting as the caller, so Postgres row level security applies. Other users' rows return 404. |
| Input | Every body, parameter and AI answer is validated with zod. Request bodies are limited to 100 KB, chat history to 30 messages. |
| AI safety | Host-written text is passed as quoted data, never inside the system prompt. AI output is validated and never rendered as HTML. Venue links are built by the server and only point to Google Maps. |
| Browser | Strict CSP (no inline or eval scripts, no framing), HSTS, `nosniff`, referrer policy, CORS allowlist without credentials. React escapes all text. |
| Abuse | General rate limit, plus stricter limits for AI routes and chat. AI calls have timeouts. |
| Errors | Clients get a code and a safe message. Stack traces and upstream details go to the logs only. |
| Dependencies | `npm audit` reports 0 vulnerabilities (production and dev). Re-check with `npm audit` in `server/` and `client/`. |

## Tests

`server/tests/security.test.ts` checks authentication on all private routes, malformed tokens, CORS, CSP, size limits, injection-style ids, error hygiene, prompt isolation, link safety and rate limiting. Run with `npm test`.

## Known limits

- Venue names, ratings and prices come from an AI model's general knowledge and are unverified. The UI says so.
- Rate limits are per client IP, held in memory, and reset when the free Render instance restarts.
