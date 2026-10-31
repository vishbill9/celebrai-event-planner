-- CelebrAI schema, migration 001: tables, indexes and row level security.
-- Run in the Supabase SQL editor (or with the Supabase CLI) against a fresh project.
-- Every table is owned by a Supabase Auth user; RLS makes sure users only ever touch their own rows.

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  event_type    text not null default '' check (char_length(event_type) <= 60),
  event_date    date,
  location      text not null default '' check (char_length(location) <= 160),
  guest_count   integer not null default 0 check (guest_count between 0 and 5000),
  budget_total  numeric(14, 2) not null default 0 check (budget_total >= 0),
  description   text not null default '' check (char_length(description) <= 2000),
  ai_plan       jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists events_user_date_idx on public.events (user_id, event_date);

create table if not exists public.guests (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null default '' check (char_length(email) <= 200),
  rsvp        text not null default 'pending' check (rsvp in ('pending', 'yes', 'no', 'maybe')),
  plus_ones   integer not null default 0 check (plus_ones between 0 and 20),
  notes       text not null default '' check (char_length(notes) <= 500),
  created_at  timestamptz not null default now()
);
create index if not exists guests_event_idx on public.guests (event_id);
create index if not exists guests_user_idx on public.guests (user_id);

create table if not exists public.budget_items (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category     text not null check (char_length(category) between 1 and 80),
  description  text not null default '' check (char_length(description) <= 200),
  estimated    numeric(14, 2) not null default 0 check (estimated >= 0),
  actual       numeric(14, 2) not null default 0 check (actual >= 0),
  paid         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists budget_items_event_idx on public.budget_items (event_id);
create index if not exists budget_items_user_idx on public.budget_items (user_id);

-- Row level security -------------------------------------------------------------------------
alter table public.events       enable row level security;
alter table public.guests       enable row level security;
alter table public.budget_items enable row level security;

-- Events: a user can do anything with their own events and nothing with anyone else's.
create policy "events_select_own" on public.events for select to authenticated using (user_id = (select auth.uid()));
create policy "events_insert_own" on public.events for insert to authenticated with check (user_id = (select auth.uid()));
create policy "events_update_own" on public.events for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "events_delete_own" on public.events for delete to authenticated using (user_id = (select auth.uid()));

-- Guests and budget lines: owned by the user AND attached to one of the user's events.
create policy "guests_select_own" on public.guests for select to authenticated using (user_id = (select auth.uid()));
create policy "guests_insert_own" on public.guests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.events e where e.id = event_id and e.user_id = (select auth.uid()))
  );
create policy "guests_update_own" on public.guests for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "guests_delete_own" on public.guests for delete to authenticated using (user_id = (select auth.uid()));

create policy "budget_select_own" on public.budget_items for select to authenticated using (user_id = (select auth.uid()));
create policy "budget_insert_own" on public.budget_items for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.events e where e.id = event_id and e.user_id = (select auth.uid()))
  );
create policy "budget_update_own" on public.budget_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budget_delete_own" on public.budget_items for delete to authenticated using (user_id = (select auth.uid()));

-- Privileges: signed-in users get table access (filtered by RLS); anonymous visitors get none.
revoke all on public.events, public.guests, public.budget_items from anon;
grant select, insert, update, delete on public.events, public.guests, public.budget_items to authenticated;
