-- Newsletter signups from the public marketing site
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'newsletter_page',
  created_at timestamptz default now(),
  unique (email)
);

alter table newsletter_subscribers enable row level security;

-- Inserts come through the service-role API route; this keeps a permissive
-- insert path open in case of client-side submission, with no public read.
do $$ begin
  if not exists (select 1 from pg_policies where tablename='newsletter_subscribers' and policyname='newsletter_subscribers_insert') then
    create policy newsletter_subscribers_insert on newsletter_subscribers for insert with check (true);
  end if;
end $$;
