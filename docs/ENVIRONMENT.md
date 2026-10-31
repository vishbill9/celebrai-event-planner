# Environment variables

Names only live in `.env.example`. Real values are set in the Render dashboard (or a local, git-ignored `.env`). Never commit credentials.

| Variable | Required | Secret | Purpose |
|---|---|---|---|
| `OLLAMA_API_KEY` | yes | **yes** | Bearer key for Ollama Cloud. Server only. |
| `OLLAMA_BASE_URL` | yes | no | `https://ollama.com` |
| `OLLAMA_MODEL` | yes | no | `glm-5.3` (the server also tries `glm-5.3:cloud` if the plain name is not found) |
| `SUPABASE_URL` | yes | no | Project URL, e.g. `https://abcd.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | no (public by design) | Used by the browser and by user-scoped API calls; RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **yes** | Used only for the health-check database ping. Server only. |
| `NODE_ENV` | yes | no | `production` on Render |
| `PORT` | auto | no | Render injects it; defaults to 8080 locally |
| `FRONTEND_URL` | yes | no | Public URL of the app, e.g. `https://celebrai-event-planner.onrender.com` |
| `CORS_ORIGIN` | yes | no | Comma-separated allowed origins; normally the same as `FRONTEND_URL` |
| `OLLAMA_TIMEOUT_MS` | no | no | Per-request AI timeout in milliseconds (default 60000) |
| `LOG_LEVEL` | no | no | `info` (default), `debug`, `warn`... |

If a required variable is missing the server still starts, logs the missing **names** (never values), and `/api/health` reports `not_configured` for the affected check.
