-- ════════════════════════════════════════════════════════════════════════
-- HealthCRM — COMPLETE DATABASE SETUP (clean install / full reset)
--
-- Run this whole file in Supabase → SQL Editor. It drops every app table and
-- recreates the entire schema, indexes, RLS, the org-helper function, and the
-- profiles table used by auth/onboarding.
--
-- Consolidates:
--   • supabase-schema.sql
--   • supabase-notifications-migration.sql  (org-wide notifications + eid)
--   • supabase-patient-code-migration.sql   (patients.patient_code)
--
-- SAFE TO RE-RUN. It will erase all data in these tables.
--
-- After running:
--   1. Authentication → Providers → enable Google (optional)
--   2. Set redirect URL: https://yourdomain/auth/callback
--   3. (Optional) enable pg_cron + run the notifications purge job at the bottom
-- ════════════════════════════════════════════════════════════════════════

-- ── Drop everything (child tables first) ────────────────────────────────
drop table if exists profiles cascade;
drop table if exists notifications cascade;
drop table if exists audit_logs cascade;
drop table if exists automation_rules cascade;
drop table if exists payments cascade;
drop table if exists invoices cascade;
drop table if exists consultations cascade;
drop table if exists followups cascade;
drop table if exists tasks cascade;
drop table if exists activities cascade;
drop table if exists patient_tags cascade;
drop table if exists lead_tags cascade;
drop table if exists tags cascade;
drop table if exists tickets cascade;
drop table if exists appointments cascade;
drop table if exists leads cascade;
drop table if exists contacts cascade;
drop table if exists patients cascade;
drop table if exists user_roles cascade;
drop table if exists role_permissions cascade;
drop table if exists permissions cascade;
drop table if exists roles cascade;
drop table if exists branches cascade;
drop table if exists organization_settings cascade;
drop table if exists organizations cascade;
drop function if exists public.get_my_org_id() cascade;

-- ── Organizations ───────────────────────────────────────────────────────
create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('Hospital','Clinic','Pharmacy','Lab','Insurance','Wellness Center','Dental Clinic','Diagnostic Center','Other')) default 'Clinic',
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  pincode text,
  country text default 'India',
  settings jsonb default '{}',
  status text check (status in ('Active','Inactive')) default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Organization Settings ───────────────────────────────────────────────
create table organization_settings (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  key text not null,
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, key)
);

-- ── Branches ────────────────────────────────────────────────────────────
create table branches (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  address text,
  status text check (status in ('Active','Inactive')) default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Roles & Permissions (RBAC) ──────────────────────────────────────────
create table roles (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table permissions (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  created_at timestamptz default now()
);

create table role_permissions (
  id uuid default gen_random_uuid() primary key,
  role_id uuid references roles(id) on delete cascade not null,
  permission_id uuid references permissions(id) on delete cascade not null,
  created_at timestamptz default now()
);

create table user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,                 -- References auth.users(id)
  role_id uuid references roles(id) on delete cascade not null,
  organization_id uuid references organizations(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- ── Patients ────────────────────────────────────────────────────────────
create table patients (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  gender text check (gender in ('Male','Female','Other')),
  date_of_birth date,
  address text,
  medical_history jsonb default '[]',
  custom_data jsonb default '{}',
  assigned_to uuid,
  patient_code text,                     -- auto-generated from org ID format
  status text check (status in ('Active','Inactive')) default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Contacts (People) ───────────────────────────────────────────────────
create table contacts (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  designation text,
  department text,
  linked_organization_id uuid references organizations(id) on delete set null,
  notes text,
  avatar_color text default '#3b82f6',
  status text check (status in ('Active','Inactive')) default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Leads ───────────────────────────────────────────────────────────────
create table leads (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  title text not null,
  description text,
  contact_id uuid references contacts(id) on delete set null,
  patient_id uuid references patients(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  stage text check (stage in ('New','Contacted','Interested','Follow-up','Converted','Lost')) default 'New',
  priority text check (priority in ('Low','Medium','High','Urgent')) default 'Medium',
  value numeric default 0,
  currency text default 'INR',
  source text default 'Other',
  assigned_to uuid,
  expected_close_date date,
  closed_date date,
  first_name text,
  last_name text,
  phone text,
  email text,
  gender text check (gender in ('Male','Female','Other')),
  date_of_birth date,
  address text,
  lost_reason text,
  custom_data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Appointments ────────────────────────────────────────────────────────
create table appointments (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  patient_id uuid references patients(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete set null,
  doctor_id uuid,
  branch_id uuid references branches(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer default 30,
  status text check (status in ('booked','confirmed','completed','cancelled')) default 'booked',
  appointment_code text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Tags + join tables ──────────────────────────────────────────────────
create table tags (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  page text check (page in ('patients','leads')) default 'patients',
  created_by uuid,
  created_at timestamptz default now(),
  unique(organization_id, name)
);

create table lead_tags (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  created_at timestamptz default now()
);

create table patient_tags (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- ── Activities / Comments ───────────────────────────────────────────────
create table activities (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  entity_type text check (entity_type in ('lead','contact','organization','patient')) not null,
  entity_id uuid not null,
  type text check (type in ('comment','email','call','meeting','note','status_change','stage_change','whatsapp','tag')) default 'comment',
  content text not null,
  -- Which page the action was performed on (powers the page-tagged timeline).
  source_page text check (source_page is null or source_page in ('lead','patient','consultation','contact','organization')),
  created_by uuid,
  created_at timestamptz default now()
);

-- ── Tasks ───────────────────────────────────────────────────────────────
create table tasks (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  title text not null,
  description text,
  entity_type text check (entity_type in ('lead','contact','organization','patient')),
  entity_id uuid,
  due_date timestamptz,
  priority text check (priority in ('Low','Medium','High','Urgent')) default 'Medium',
  status text check (status in ('Pending','In Progress','Completed','Cancelled')) default 'Pending',
  assigned_to uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Follow-ups ──────────────────────────────────────────────────────────
create table followups (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  type text check (type in ('Call','Email','Meeting','Demo','Site Visit','WhatsApp','Other')) default 'Call',
  scheduled_at timestamptz not null,
  caller_name text,
  notes text,
  outcome text,
  status text check (status in ('Scheduled','Completed','Missed','Rescheduled')) default 'Scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Consultations (clinical visit records) ──────────────────────────────
create table consultations (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  patient_id uuid references patients(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  doctor_id uuid,
  consultation_type text check (consultation_type in ('Initial','Follow-up','Urgent','Routine','Teleconsultation','Walk-in')) default 'Initial',
  status text check (status in ('Scheduled','Completed','Cancelled','No-Show')) default 'Completed',
  consulted_at timestamptz not null default now(),
  chief_complaint text,
  clinical_notes text,
  diagnosis text,
  treatment_plan text,
  prescription text,
  vitals jsonb default '{}',
  visit_details jsonb default '[]',
  follow_up_required boolean default false,
  follow_up_date date,
  duration_minutes integer default 30,
  amount numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Billing & Finance ───────────────────────────────────────────────────
create table invoices (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  patient_id uuid references patients(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete set null,
  invoice_number text not null,
  amount numeric not null,
  tax numeric default 0,
  total numeric not null,
  status text check (status in ('Draft','Sent','Paid','Partial','Overdue','Cancelled')) default 'Draft',
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table payments (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  invoice_id uuid references invoices(id) on delete cascade not null,
  amount numeric not null,
  payment_method text check (payment_method in ('Cash','Card','UPI','Bank Transfer','Other')),
  payment_date timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- ── Support Tickets ─────────────────────────────────────────────────────
create table tickets (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  created_by uuid,
  subject text not null,
  description text,
  category text check (category in ('Bug','Feature Request','Billing','Account','General','Other')) default 'General',
  priority text check (priority in ('Low','Medium','High','Urgent')) default 'Medium',
  status text check (status in ('Open','In Progress','Resolved','Closed')) default 'Open',
  contact_email text,
  contact_phone text,
  admin_response text,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Automation Rules ────────────────────────────────────────────────────
create table automation_rules (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  trigger_event text not null,
  conditions jsonb default '{}',
  actions jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Audit Logs ──────────────────────────────────────────────────────────
-- Tracks critical activity: logins/logouts, patient views/edits, deletions,
-- user creation, permission changes, and data exports. entity_type/entity_id
-- are nullable because some events (login/logout/export) have no entity.
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid,
  actor_name text,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id uuid,
  description text,
  status text default 'success',        -- success | failed
  metadata jsonb default '{}',
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- ── Notifications (org-wide; consolidated with notifications migration) ──
create table notifications (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid,                          -- optional (org-wide model)
  eid text,                              -- client event id, for cross-tab dedupe
  type text default 'info',              -- lead_created | patient_created | appointment | followup | task | ...
  title text not null,
  message text,
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────
create index leads_org_idx on leads(organization_id);
create index leads_stage_idx on leads(stage);
create index patients_org_idx on patients(organization_id);
create index appointments_org_idx on appointments(organization_id);
create index appointments_scheduled_idx on appointments(scheduled_at);
create index tasks_org_idx on tasks(organization_id);
create index activities_org_idx on activities(organization_id);
create index followups_org_idx on followups(organization_id);
create index consultations_org_idx on consultations(organization_id);
create index consultations_patient_idx on consultations(patient_id);
create index consultations_lead_idx on consultations(lead_id);
create index consultations_date_idx on consultations(consulted_at desc);
create index tickets_org_idx on tickets(organization_id);
create index invoices_org_idx on invoices(organization_id);
create index automation_rules_org_idx on automation_rules(organization_id);
create index notifications_org_created_idx on notifications(organization_id, created_at desc);
create index audit_logs_org_created_idx on audit_logs(organization_id, created_at desc);
create index audit_logs_action_idx on audit_logs(action);

-- ── Enable Row Level Security ───────────────────────────────────────────
alter table organizations enable row level security;
alter table organization_settings enable row level security;
alter table branches enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;
alter table patients enable row level security;
alter table contacts enable row level security;
alter table leads enable row level security;
alter table appointments enable row level security;
alter table tags enable row level security;
alter table lead_tags enable row level security;
alter table patient_tags enable row level security;
alter table activities enable row level security;
alter table tasks enable row level security;
alter table followups enable row level security;
alter table consultations enable row level security;
alter table tickets enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table automation_rules enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;

-- ── Permissive policies (TIGHTEN BEFORE PRODUCTION) ─────────────────────
create policy "Allow all org access" on organizations for all using (true) with check (true);
create policy "Allow all settings access" on organization_settings for all using (true) with check (true);
create policy "Allow all branch access" on branches for all using (true) with check (true);
create policy "Allow all role access" on roles for all using (true) with check (true);
create policy "Allow all permission access" on permissions for all using (true) with check (true);
create policy "Allow all role_permission access" on role_permissions for all using (true) with check (true);
create policy "Allow all user_role access" on user_roles for all using (true) with check (true);
create policy "Allow all patient access" on patients for all using (true) with check (true);
create policy "Allow all contact access" on contacts for all using (true) with check (true);
create policy "Allow all lead access" on leads for all using (true) with check (true);
create policy "Allow all appointment access" on appointments for all using (true) with check (true);
create policy "Allow all tag access" on tags for all using (true) with check (true);
create policy "Allow all lead_tag access" on lead_tags for all using (true) with check (true);
create policy "Allow all patient_tag access" on patient_tags for all using (true) with check (true);
create policy "Allow all activity access" on activities for all using (true) with check (true);
create policy "Allow all task access" on tasks for all using (true) with check (true);
create policy "Allow all followup access" on followups for all using (true) with check (true);
create policy "Allow all consultation access" on consultations for all using (true) with check (true);
create policy "Allow all ticket access" on tickets for all using (true) with check (true);
create policy "Allow all invoice access" on invoices for all using (true) with check (true);
create policy "Allow all payment access" on payments for all using (true) with check (true);
create policy "Allow all automation access" on automation_rules for all using (true) with check (true);
create policy "Allow all audit access" on audit_logs for all using (true) with check (true);
create policy "Allow all notification access" on notifications for all using (true) with check (true);

-- ── Profiles (links auth.users → one organization) ──────────────────────
-- Created before get_my_org_id() because the function reads from it.
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  organization_id uuid references organizations(id) on delete set null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- ── Helper: current user's org_id without RLS recursion ─────────────────
-- security definer so it bypasses RLS on profiles when resolving the org.
create or replace function public.get_my_org_id()
returns uuid
language sql
security definer
stable
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- Own profile access
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- Teammates in the same org can see each other
create policy "Org members can view teammates"
  on profiles for select
  using (
    organization_id is not null
    and organization_id = public.get_my_org_id()
  );

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Grants: let the Supabase API roles reach these tables ───────────────
-- RLS policies decide WHICH ROWS are visible, but the role still needs
-- base table privileges or Postgres throws "permission denied for table".
-- Required when tables are created manually in the SQL editor.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;

-- Apply the same grants automatically to any tables created later.
alter default privileges in schema public
  grant all privileges on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all privileges on sequences to anon, authenticated, service_role;

-- ── Realtime: let clients subscribe to notification inserts ─────────────
do $$
begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- OPTIONAL — Auto-purge notifications older than 30 days (pg_cron).
-- Run SEPARATELY after enabling pg_cron (Database → Extensions → pg_cron).
-- ════════════════════════════════════════════════════════════════════════
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'purge-old-notifications',
--   '0 3 * * *',
--   $$ delete from notifications where created_at < now() - interval '30 days' $$
-- );
