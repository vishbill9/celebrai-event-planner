# API reference

Base path: `/api`. JSON in and out. Except for `/health` and `/config`, every route needs `Authorization: Bearer <Supabase access token>`.

Errors always look like:

```json
{ "error": { "code": "validation_error", "message": "Please check the highlighted fields.", "details": [{ "path": "title", "message": "Give your event a name" }] } }
```

Common statuses: 400 invalid input, 401 not signed in, 404 not found (also for other users' rows), 409 conflict, 429 rate limited, 502 AI returned something unreadable, 503 AI unavailable, 504 AI timed out.

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{status, version, environment, uptimeSeconds, timestamp, checks:{database, ai}}`. Add `?deep=1` to also probe Ollama Cloud, the main model and the backup model. No secrets. |
| GET | `/config` | `{configured, supabaseUrl, supabaseAnonKey}` for the browser client |

## Events

| Method | Path | Body / result |
|---|---|---|
| GET | `/events` | `{events:[...]}` with `guestsInvited`, `budgetItems` counts |
| POST | `/events` | `{title, eventType?, eventDate? (YYYY-MM-DD), location?, guestCount?, budgetTotal?, description?}` -> `201 {event}` |
| GET | `/events/:id` | `{event, guests, budget}` |
| PATCH | `/events/:id` | any subset of the create fields -> `{event}` |
| DELETE | `/events/:id` | `{ok:true}` (cascades) |

## Guests

| Method | Path | Body / result |
|---|---|---|
| GET | `/events/:eventId/guests` | `{guests}` |
| POST | `/events/:eventId/guests` | `{name, email?, rsvp?, plusOnes?, notes?}` -> `201 {guest}` (max 1000 per event) |
| PATCH | `/guests/:id` | subset of the above -> `{guest}` |
| DELETE | `/guests/:id` | `{ok:true}` |

## Budget

| Method | Path | Body / result |
|---|---|---|
| GET | `/events/:eventId/budget` | `{items}` |
| POST | `/events/:eventId/budget` | `{category, description?, estimated?, actual?, paid?}` -> `201 {item}` |
| PATCH | `/budget/:id` | subset -> `{item}` |
| DELETE | `/budget/:id` | `{ok:true}` |

## AI (rate limited: 20 requests per 10 minutes per client)

| Method | Path | Result |
|---|---|---|
| POST | `/events/:id/plan` | Generates and saves the plan: `{plan:{summary, theme, surprise_idea, timeline[], checklist[], budget_breakdown[], tips[]}}` |
| POST | `/events/:id/plan/apply-budget` | Turns the saved plan's budget breakdown into budget lines: `201 {items}`; `409 no_plan` if no plan yet |
| POST | `/events/:id/invitation` | Body `{tone: "warm", "playful" or "formal"}` -> `{text}` (not stored) |
