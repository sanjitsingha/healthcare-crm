-- Status checks table: stores results of periodic health checks.
-- Run this in Supabase → SQL Editor before deploying the status page.

create table if not exists public.status_checks (
  id         uuid        default gen_random_uuid() primary key,
  service    text        not null,
  status     text        not null check (status in ('operational', 'degraded', 'outage')),
  latency_ms integer,
  message    text,
  checked_at timestamptz default now() not null
);

-- Fast lookup for the history and trend queries
create index if not exists status_checks_service_at
  on public.status_checks (service, checked_at desc);

-- RLS: public read (status page is unauthenticated), API route writes via service role
alter table public.status_checks enable row level security;

create policy "Public can read status_checks"
  on public.status_checks for select
  using (true);

create policy "Service role can insert status_checks"
  on public.status_checks for insert
  with check (true);

-- Optional: auto-prune rows older than 90 days to keep the table lean.
-- Run this separately if you want it (requires pg_cron extension).
-- select cron.schedule('prune-status-checks', '0 3 * * *',
--   $$delete from public.status_checks where checked_at < now() - interval '90 days'$$);
