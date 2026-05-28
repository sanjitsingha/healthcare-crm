-- Healthcare CRM Schema

-- Organizations table
create table if not exists organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('Hospital','Clinic','Pharmacy','Lab','Insurance','Other')) default 'Clinic',
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  pincode text,
  country text default 'India',
  tags text[] default '{}',
  notes text,
  status text check (status in ('Active','Inactive')) default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contacts (People) table
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  designation text,
  department text,
  organization_id uuid references organizations(id) on delete set null,
  tags text[] default '{}',
  notes text,
  avatar_color text default '#3b82f6',
  status text check (status in ('Active','Inactive')) default 'Active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leads table
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  contact_id uuid references contacts(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  stage text check (stage in ('New','Contacted','Qualified','Proposal','Negotiation','Won','Lost')) default 'New',
  priority text check (priority in ('Low','Medium','High','Urgent')) default 'Medium',
  value numeric default 0,
  currency text default 'INR',
  source text check (source in ('Website','Referral','Cold Call','Email','Event','Social Media','Other')) default 'Other',
  assigned_to text,
  expected_close_date date,
  closed_date date,
  tags text[] default '{}',
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activities / Comments table
create table if not exists activities (
  id uuid default gen_random_uuid() primary key,
  entity_type text check (entity_type in ('lead','contact','organization')) not null,
  entity_id uuid not null,
  type text check (type in ('comment','email','call','meeting','note','status_change','stage_change')) default 'comment',
  content text not null,
  created_by text default 'You',
  created_at timestamptz default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  entity_type text check (entity_type in ('lead','contact','organization')),
  entity_id uuid,
  due_date timestamptz,
  priority text check (priority in ('Low','Medium','High','Urgent')) default 'Medium',
  status text check (status in ('Pending','In Progress','Completed','Cancelled')) default 'Pending',
  assigned_to text default 'You',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Follow-ups table
create table if not exists followups (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  type text check (type in ('Call','Email','Meeting','Demo','Site Visit','Other')) default 'Call',
  scheduled_at timestamptz not null,
  notes text,
  outcome text,
  status text check (status in ('Scheduled','Completed','Missed','Rescheduled')) default 'Scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tags master table (optional, for autocomplete)
create table if not exists tags (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists leads_stage_idx on leads(stage);
create index if not exists leads_contact_idx on leads(contact_id);
create index if not exists leads_org_idx on leads(organization_id);
create index if not exists contacts_org_idx on contacts(organization_id);
create index if not exists activities_entity_idx on activities(entity_type, entity_id);
create index if not exists tasks_entity_idx on tasks(entity_type, entity_id);
create index if not exists followups_lead_idx on followups(lead_id);

-- Enable Row Level Security (optional, for multi-tenant)
alter table organizations enable row level security;
alter table contacts enable row level security;
alter table leads enable row level security;
alter table activities enable row level security;
alter table tasks enable row level security;
alter table followups enable row level security;

-- Permissive policies for now (replace with auth-based for production)
create policy "Allow all" on organizations for all using (true) with check (true);
create policy "Allow all" on contacts for all using (true) with check (true);
create policy "Allow all" on leads for all using (true) with check (true);
create policy "Allow all" on activities for all using (true) with check (true);
create policy "Allow all" on tasks for all using (true) with check (true);
create policy "Allow all" on followups for all using (true) with check (true);
