-- CelebrAI schema, migration 003: store the AI Creative Studio concept on each event.
alter table public.events add column if not exists ai_creative jsonb;
