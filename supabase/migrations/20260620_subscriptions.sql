-- Product subscriptions are intentionally separate from patient invoices/payments.
create table if not exists subscription_plans (
  id text primary key,
  name text not null,
  monthly_price integer not null,
  annual_price integer not null,
  seat_limit integer,
  capabilities jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

insert into subscription_plans (id, name, monthly_price, annual_price, seat_limit, capabilities) values
  ('starter', 'Starter', 1499, 14990, 3, '["core"]'),
  ('growth', 'Growth', 3499, 34990, 10, '["core","reports","automation","pharmacy","roles"]'),
  ('enterprise', 'Enterprise', 7999, 79990, null, '["core","reports","automation","pharmacy","roles","custom_modules","integrations"]')
on conflict (id) do update set name = excluded.name, monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price, seat_limit = excluded.seat_limit, capabilities = excluded.capabilities;

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  plan_id text not null references subscription_plans(id),
  interval text not null check (interval in ('month','year')),
  status text not null check (status in ('trialing','active','grace','expired','cancelled')) default 'trialing',
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  subscription_contact_user_id uuid references auth.users(id) on delete set null,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  amount integer not null check (amount >= 0),
  gst_amount integer not null default 0 check (gst_amount >= 0),
  reference text,
  received_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  plan_id text not null references subscription_plans(id),
  interval text not null check (interval in ('month','year')),
  expires_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_organization_id uuid references organizations(id) on delete set null,
  redeemed_by_user_id uuid references auth.users(id) on delete set null
);

create extension if not exists pgcrypto;

create or replace function public.redeem_activation_code(p_code_hash text, p_organization_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code activation_codes%rowtype; v_sub subscriptions%rowtype; v_end timestamptz;
begin
  select * into v_code from activation_codes
    where code_hash = p_code_hash and redeemed_at is null and revoked_at is null
      and (expires_at is null or expires_at > now())
    for update;
  if not found then return jsonb_build_object('ok', false); end if;
  select * into v_sub from subscriptions where organization_id = p_organization_id for update;
  if not found or v_sub.subscription_contact_user_id is distinct from p_user_id then return jsonb_build_object('ok', false); end if;
  v_end := case when v_code.interval = 'year' then now() + interval '1 year' else now() + interval '1 month' end;
  update activation_codes set redeemed_at = now(), redeemed_by_organization_id = p_organization_id, redeemed_by_user_id = p_user_id where id = v_code.id;
  update subscriptions set plan_id = v_code.plan_id, interval = v_code.interval, status = 'active',
    current_period_starts_at = now(), current_period_ends_at = v_end, cancel_at_period_end = false, cancelled_at = null, updated_at = now()
    where id = v_sub.id;
  insert into subscription_events(subscription_id, event_type, actor_user_id, metadata)
    values (v_sub.id, 'activation_code_redeemed', p_user_id, jsonb_build_object('plan_id', v_code.plan_id, 'interval', v_code.interval));
  return jsonb_build_object('ok', true, 'plan_id', v_code.plan_id, 'ends_at', v_end);
end;
$$;

create index if not exists subscriptions_status_idx on subscriptions(status);
create index if not exists subscription_events_subscription_idx on subscription_events(subscription_id, created_at desc);

-- Backfill existing clinics into the same 14-day Enterprise trial used by onboarding.
insert into subscriptions (organization_id, plan_id, interval, status, trial_ends_at, grace_ends_at, subscription_contact_user_id)
select o.id, 'enterprise', 'month', 'trialing', now() + interval '14 days', now() + interval '21 days', p.id
from organizations o
left join lateral (
  select id from profiles where organization_id = o.id order by created_at asc nulls last limit 1
) p on true
on conflict (organization_id) do nothing;

alter table subscription_plans enable row level security;
alter table subscriptions enable row level security;
alter table subscription_payments enable row level security;
alter table subscription_events enable row level security;
alter table activation_codes enable row level security;

create policy "Plans are readable" on subscription_plans for select using (true);
create policy "Members read own subscription" on subscriptions for select using (organization_id = public.get_my_org_id());
create policy "Members read own subscription payments" on subscription_payments for select using (
  subscription_id in (select id from subscriptions where organization_id = public.get_my_org_id())
);
create policy "Members read own subscription events" on subscription_events for select using (
  subscription_id in (select id from subscriptions where organization_id = public.get_my_org_id())
);

-- Service-role route handlers perform all subscription writes. Do not grant direct code access.
