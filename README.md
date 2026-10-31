# CelebrAI - AI event planner

CelebrAI helps you plan any celebration. Create an event and an AI (GLM-5.3 on Ollama Cloud) drafts a theme, timeline, checklist, budget split and tips. Then manage guests and RSVPs, track spending against your budget, and have the AI write the invitation in the tone you pick.

- **Live app:** _added after the first Render deploy_
- **Walkthrough video:** _added with the final submission_

## Try it without installing anything

Open the live app and sign in with the judges' test account (or create your own):

| | |
|---|---|
| Email | `judge@celebrai.test` |
| Password | `Celebrai-Judge-2026` |

Suggested path: **Create event** (confetti!) -> **Generate plan** -> **Add these to my budget** -> add a few **Guests** and change an RSVP -> write an **Invitation** -> refresh the page and see everything persisted.

The free Render plan sleeps when idle, so the first request after a pause can take about 30-60 seconds.

## Features

- Email/password accounts with Supabase Auth; every user only ever sees their own data (Postgres row level security).
- Events dashboard with countdown, guest and budget counts.
- AI plan from GLM-5.3: theme, surprise idea, timeline, checklist, budget breakdown, tips. Plans are saved on the event.
- Guest list with RSVP status and plus-ones.
- Budget tracker (planned vs spent, paid flag, over-budget warning), one click to import the AI's suggested budget.
- AI invitation writer with warm, playful and formal tones.
- Honest failures: if the AI is unreachable, slow, or returns something unreadable, you get a clear error, never a fake answer.

## Architecture

```
Browser (React + TypeScript, Vite)
   |  HTTPS, Bearer token (Supabase session)
Express + TypeScript on Render  ---- Supabase PostgreSQL (RLS, user-scoped client)
   |  HTTPS, API key held only on the server
Ollama Cloud (glm-5.3)
```

One Render Web Service builds the React app and Express serves it with an SPA fallback, so the whole product has a single public URL and no CORS surprises. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

```
client/            React + Vite frontend
server/            Express API (routes, middleware, Ollama client, tests)
db/migrations/     SQL schema, RLS policies, triggers
db/seed_demo.sql   Optional sample data for the test account
docs/              API, database, environment and deployment guides
render.yaml        Render Blueprint (build, start, health check, auto-deploy)
```

## Local development

Requirements: Node.js 20+, a Supabase project, and an Ollama Cloud API key.

```bash
git clone https://github.com/vishbill9/celebrai-event-planner.git
cd celebrai-event-planner
cp .env.example .env        # fill in your own values
npm run install:all
# apply db/migrations/*.sql in the Supabase SQL editor
npm run dev:server          # API on http://localhost:8080
npm run dev:client          # app on http://localhost:5173 (proxies /api)
```

Checks: `npm test` (33 API tests with the AI and database mocked) and `npm run typecheck`.

## Documentation

- [Deployment (GitHub -> Render)](docs/DEPLOYMENT.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Database setup and schema](docs/DATABASE.md)
- [API reference](docs/API.md)

## Security notes

- `OLLAMA_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` exist only in server environment variables and never reach the browser. The public Supabase anon key is served by `GET /api/config`.
- Helmet with a strict CSP, HSTS, a CORS allowlist, request validation (zod), rate limits (general and stricter for AI), request size limits, redacted JSON logs, AI timeouts and graceful shutdown.
- `GET /api/health` reports status only, with no secrets or infrastructure details.
