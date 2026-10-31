# Database setup

CelebrAI uses Supabase PostgreSQL. Schema and policies live in `db/migrations/`.

## One-time setup

1. Create a Supabase project (free tier is fine).
2. **SQL editor** -> run `db/migrations/001_init.sql`, then `002_updated_at_trigger.sql`.
3. **Authentication -> Providers -> Email**: keep Email enabled. For a frictionless demo, turn off "Confirm email" (otherwise new sign-ups must click a link first).
4. **Authentication -> Users -> Add user -> Create new user**: email `judge@celebrai.test`, password `Celebrai-Judge-2026`, tick **Auto Confirm User**. This is the public test account.
5. Optional: run `db/seed_demo.sql` to give that account a sample event.
6. **Project Settings -> API**: copy the project URL, anon key and service_role key into Render (see ENVIRONMENT.md).

## Tables

| Table | Key columns |
|---|---|
| `events` | `id`, `user_id` -> auth.users, `title`, `event_type`, `event_date`, `location`, `guest_count`, `budget_total`, `description`, `ai_plan` (jsonb), `created_at`, `updated_at` |
| `guests` | `id`, `event_id` -> events (cascade), `user_id`, `name`, `email`, `rsvp` (pending/yes/no/maybe), `plus_ones`, `notes` |
| `budget_items` | `id`, `event_id` -> events (cascade), `user_id`, `category`, `description`, `estimated`, `actual`, `paid` |

`user_id` defaults to `auth.uid()`. Deleting an event deletes its guests and budget lines; deleting a user deletes everything they own.

## Security model

Row level security is enabled on every table. Policies require `user_id = auth.uid()`, and inserts into `guests` and `budget_items` additionally require that the parent event belongs to the same user. The API creates a Supabase client per request using the caller's access token, so these policies apply to every query. The `anon` role has no table privileges. Check constraints mirror the API validation (lengths, non-negative amounts, RSVP values).

## Migrating

Migrations are plain SQL, idempotent where possible (`if not exists`, `create or replace`). Add new numbered files (`003_...sql`) and run them in order.
