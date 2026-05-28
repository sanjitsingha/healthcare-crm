-- Healthcare CRM Schema (Multi-tenant)

-- Organizations table
create table if not exists organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('Hospital','Clinic','Pharmacy','Lab','Insurance','Wellness Center','Dental Clinic','Other')) default 'Clinic',
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

-- Organization Settings
create table if not exists organization_settings (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  key text not null,
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, key)
);

-- Branches
create table if not exists branches (
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

-- Roles & Permissions
create table if not exists roles (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists permissions (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists role_permissions (
  id uuid default gen_random_uuid() primary key,
  role_id uuid references roles(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null, -- References auth.users(id)
  role_id uuid references roles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  created_at timestamptz default now()
);

-- Patients
create table if not exists patients (
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
  status text check (status in ('Active','Inactive')) default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contacts (People) table
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  designation text,
  department text,
  linked_organization_id uuid references organizations(id) on delete set null, -- If they belong to another org (e.g. referral)
  notes text,
  avatar_color text default '#3b82f6',
  status text check (status in ('Active','Inactive')) default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leads table
create table if not exists leads (
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
  assigned_to uuid, -- References auth.users(id)
  expected_close_date date,
  closed_date date,
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Appointments
create table if not exists appointments (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  patient_id uuid references patients(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  doctor_id uuid, -- References auth.users(id) or a separate doctors table
  branch_id uuid references branches(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer default 30,
  status text check (status in ('booked','confirmed','completed','cancelled')) default 'booked',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tags
create table if not exists tags (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  created_by uuid,
  created_at timestamptz default now(),
  unique(organization_id, name)
);

create table if not exists lead_tags (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists patient_tags (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  created_at timestamptz default now()
);

-- Activities / Comments table
create table if not exists activities (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  entity_type text check (entity_type in ('lead','contact','organization','patient')) not null,
  entity_id uuid not null,
  type text check (type in ('comment','email','call','meeting','note','status_change','stage_change','whatsapp')) default 'comment',
  content text not null,
  created_by uuid,
  created_at timestamptz default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade,
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

-- Follow-ups table
create table if not exists followups (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  type text check (type in ('Call','Email','Meeting','Demo','Site Visit','WhatsApp','Other')) default 'Call',
  scheduled_at timestamptz not null,
  notes text,
  outcome text,
  status text check (status in ('Scheduled','Completed','Missed','Rescheduled')) default 'Scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Billing & Finance
create table if not exists invoices (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  patient_id uuid references patients(id) on delete cascade,
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

create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  invoice_id uuid references invoices(id) on delete cascade,
  amount numeric not null,
  payment_method text check (payment_method in ('Cash','Card','UPI','Bank Transfer','Other')),
  payment_date timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- Automation Rules
create table if not exists automation_rules (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  trigger_event text not null, -- e.g. 'lead_created'
  conditions jsonb default '{}',
  actions jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Audit Logs
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid not null,
  title text not null,
  message text,
  type text default 'info',
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists leads_org_idx on leads(organization_id);
create index if not exists leads_stage_idx on leads(stage);
create index if not exists patients_org_idx on patients(organization_id);
create index if not exists appointments_org_idx on appointments(organization_id);
create index if not exists appointments_scheduled_idx on appointments(scheduled_at);
create index if not exists tasks_org_idx on tasks(organization_id);
create index if not exists activities_org_idx on activities(organization_id);

-- Enable Row Level Security (RLS)
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
alter table invoices enable row level security;
alter table payments enable row level security;
alter table automation_rules enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;

-- Permissive policies for now (filter by organization_id in practice)
-- In a real app, you'd use (auth.uid() in (select user_id from user_roles where organization_id = table.organization_id))
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
create policy "Allow all invoice access" on invoices for all using (true) with check (true);
create policy "Allow all payment access" on payments for all using (true) with check (true);
create policy "Allow all automation access" on automation_rules for all using (true) with check (true);
create policy "Allow all audit access" on audit_logs for all using (true) with check (true);
create policy "Allow all notification access" on notifications for all using (true) with check (true);
