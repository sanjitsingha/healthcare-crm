-- ════════════════════════════════════════════════════════════════
-- Automation engine — execution log.
-- One row per rule that matched + ran for an event, so the Rules page
-- can show "Recent runs" and you can see whether actions succeeded.
-- Run this in the Supabase SQL editor (it is a single safe statement set).
-- ════════════════════════════════════════════════════════════════

create table if not exists automation_runs (
  id              uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  rule_id         text,                 -- rule.id from org.settings.rules
  rule_name       text,
  target          text,                 -- lead | patient | appointment | task | consultation
  event           text,                 -- e.g. lead_created, stage_changed
  entity_type     text,                 -- lead | patient | appointment | task | followup | consultation
  entity_id       uuid,
  status          text not null default 'success'
                    check (status in ('success','partial','failed','skipped')),
  actions         jsonb not null default '[]'::jsonb,  -- [{ type, status, error, detail }]
  error           text,
  created_at      timestamptz default now()
);

create index if not exists automation_runs_org_created_idx
  on automation_runs (organization_id, created_at desc);

create index if not exists automation_runs_rule_idx
  on automation_runs (organization_id, rule_id, created_at desc);

-- RLS — permissive to match the rest of the project (tighten before prod).
alter table automation_runs enable row level security;
drop policy if exists "automation_runs all" on automation_runs;
create policy "automation_runs all" on automation_runs for all using (true) with check (true);

-- Optional: auto-purge logs older than 60 days (needs pg_cron; run separately).
-- create extension if not exists pg_cron;
-- select cron.schedule('purge-automation-runs', '0 3 * * *',
--   $$ delete from automation_runs where created_at < now() - interval '60 days' $$);
