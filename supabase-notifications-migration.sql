-- ── Notifications table ────────────────────────────────────────
-- Org-wide notification feed. Read/dismissed state is tracked per-user on the
-- client; this table only stores the notification content.

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

-- RLS — kept permissive to match the rest of the project (tighten before prod).
alter table notifications enable row level security;
drop policy if exists "notifications all" on notifications;
create policy "notifications all" on notifications for all using (true) with check (true);

-- Realtime: let clients subscribe to inserts.
alter publication supabase_realtime add table notifications;

-- ── Auto-delete after 30 days (pg_cron) ────────────────────────
create extension if not exists pg_cron;

-- (Re)schedule the daily purge at 03:00 UTC.
select cron.unschedule('purge-old-notifications')
where exists (select 1 from cron.job where jobname = 'purge-old-notifications');

select cron.schedule(
  'purge-old-notifications',
  '0 3 * * *',
  $$ delete from notifications where created_at < now() - interval '30 days' $$
);
