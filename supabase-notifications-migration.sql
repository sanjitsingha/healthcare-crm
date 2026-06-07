-- ════════════════════════════════════════════════════════════════
-- STEP 1 — Core table. Run this first, on its own. It MUST succeed.
-- (Supabase SQL editor runs a script as one transaction, so keep the
--  pg_cron part separate — if it fails it would roll back the table.)
-- ════════════════════════════════════════════════════════════════

create table if not exists notifications (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  eid             text,                 -- client event id (dedupe across tabs)
  type            text,                 -- lead_created | patient_created | appointment | followup | task | ...
  title           text not null,
  message         text,
  created_at      timestamptz default now()
);

create index if not exists notifications_org_created_idx
  on notifications (organization_id, created_at desc);

-- RLS — permissive to match the rest of the project (tighten before prod).
alter table notifications enable row level security;
drop policy if exists "notifications all" on notifications;
create policy "notifications all" on notifications for all using (true) with check (true);

-- Realtime: let clients subscribe to inserts (ignore if already added).
do $$
begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;

-- Quick check — should return the columns above:
-- select * from notifications limit 1;


-- ════════════════════════════════════════════════════════════════
-- STEP 2 — Auto-delete after 30 days (pg_cron). Run SEPARATELY, after
-- Step 1 succeeds. If pg_cron isn't enabled, enable it first:
--   Dashboard → Database → Extensions → search "pg_cron" → enable.
-- This step is optional; the table works without it.
-- ════════════════════════════════════════════════════════════════

-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'purge-old-notifications',
--   '0 3 * * *',
--   $$ delete from notifications where created_at < now() - interval '30 days' $$
-- );
