-- ════════════════════════════════════════════════════════════════════════
-- Audit Logs — upgrade the existing audit_logs table for Settings → Logs.
-- Safe to run on a live DB (won't drop data). Run once in the SQL Editor.
--
-- Adds actor name/email, description, status, metadata, and relaxes the
-- NOT NULL on entity_type/entity_id (login/logout/export have no entity).
-- ════════════════════════════════════════════════════════════════════════

-- Create the table if it doesn't exist yet (fresh installs).
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  created_at timestamptz default now()
);

-- Add the new columns (idempotent).
alter table audit_logs add column if not exists actor_name   text;
alter table audit_logs add column if not exists actor_email  text;
alter table audit_logs add column if not exists description  text;
alter table audit_logs add column if not exists status       text default 'success';
alter table audit_logs add column if not exists metadata     jsonb default '{}';
alter table audit_logs add column if not exists old_data     jsonb;
alter table audit_logs add column if not exists new_data     jsonb;

-- Relax NOT NULL constraints from the old schema (ignore if already nullable).
do $$
begin
  alter table audit_logs alter column entity_type drop not null;
exception when others then null;
end $$;
do $$
begin
  alter table audit_logs alter column entity_id drop not null;
exception when others then null;
end $$;

-- Indexes for the Logs page (recent-first, filter by action).
create index if not exists audit_logs_org_created_idx on audit_logs(organization_id, created_at desc);
create index if not exists audit_logs_action_idx on audit_logs(action);

-- RLS — permissive to match the rest of the project (tighten before prod).
alter table audit_logs enable row level security;
drop policy if exists "Allow all audit access" on audit_logs;
create policy "Allow all audit access" on audit_logs for all using (true) with check (true);

-- Make sure the API roles can reach it.
grant all privileges on audit_logs to anon, authenticated, service_role;
