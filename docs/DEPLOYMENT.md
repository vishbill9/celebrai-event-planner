# Deployment: GitHub -> Render

CelebrAI is one Render Web Service. The build installs and compiles the server and the client; Express then serves the API and the built React app.

## 1. Supabase
Follow [DATABASE.md](DATABASE.md) (migrations, test user, keys).

## 2. GitHub
The repository is public, far below 10 MB, and contains no secrets, `node_modules` or build output (see `.gitignore`).

## 3. Render
1. Render dashboard -> **New -> Blueprint** -> pick this repository. Render reads `render.yaml`.
2. When prompted, fill in the secret values: `OLLAMA_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus `FRONTEND_URL` and `CORS_ORIGIN` (use the URL Render shows for the service, e.g. `https://celebrai-event-planner.onrender.com`; you can edit them after the first deploy). Non-secret values are already in `render.yaml`.

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm run install:all && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Auto-deploy | on, branch `main` |

Manual alternative: New -> Web Service with the same commands, then add the variables from [ENVIRONMENT.md](ENVIRONMENT.md).

## 4. Continuous deployment
Every push to `main` builds and deploys automatically. Deploy logs are on the service's **Logs** and **Events** tabs. The app writes structured JSON logs (secrets redacted); failed health checks keep the previous version live.

## 5. Production checklist
- HTTPS is terminated by Render; the app redirects HTTP to HTTPS and sends HSTS.
- Open `/api/health`: `database` should read `ok` and `ai` `configured`. Add `?deep=1` to confirm Ollama Cloud and the `glm-5.3` model respond (`aiReachable` and `aiModelAvailable` true).
- Sign in with the test account, create an event, generate a plan, refresh, and confirm it persisted.

## Troubleshooting
- **Health shows `not_configured`**: a required variable is missing; the server log lists the missing names.
- **AI returns 503**: check `OLLAMA_API_KEY` and `OLLAMA_MODEL`; run `/api/health?deep=1`.
- **Sign-up says to confirm email**: disable "Confirm email" in Supabase or use the test account.
- **Slow first load**: free instances sleep when idle.
