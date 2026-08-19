-- Globowax Club — initial schema
-- Mirrors lib/types.ts. RLS policies are defined for when Supabase Auth
-- is wired in (Phase "auth"); until then, the app talks to Postgres with
-- the service_role key from server components only, which bypasses RLS
-- by design — these policies are the safety net for later, not decoration.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Core tenant / identity
-- ---------------------------------------------------------------------

create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  brand_color text not null default '#2FBF71',
  created_at timestamptz not null default now()
);

create table app_users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null check (role in ('super_admin','tenant_admin','staff','customer')),
  email text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  surname text not null,
  email text,
  mobile text not null,
  dob date,
  marketing_consent boolean not null default false,
  whatsapp_consent boolean not null default false,
  sms_consent boolean not null default false,
  email_consent boolean not null default false,
  referral_code text not null unique,
  points_balance integer not null default 0, -- cache only; points_ledger is the source of truth
  tier_id uuid,
  created_at timestamptz not null default now()
);
create index on customers(tenant_id);
create index on customers(mobile);
create index on customers(referral_code);

create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  reg_number text not null,
  make text not null,
  model text not null,
  year integer,
  colour text,
  fuel_type text
);
create index on vehicles(customer_id);

-- ---------------------------------------------------------------------
-- Services, transactions, points
-- ---------------------------------------------------------------------

create table services (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  points_value integer not null,
  category text,
  duration_minutes integer,
  active boolean not null default true
);
create index on services(tenant_id);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  vehicle_id uuid references vehicles(id),
  staff_id uuid,
  total_amount numeric(10,2) not null,
  payment_method text not null default 'card' check (payment_method in ('card','cash','other')),
  created_at timestamptz not null default now()
);
create index on transactions(customer_id);
create index on transactions(tenant_id, created_at desc);

create table transaction_items (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  service_id uuid not null references services(id),
  price numeric(10,2) not null,
  points_earned integer not null default 0
);
create index on transaction_items(transaction_id);

create table points_ledger (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  transaction_id uuid references transactions(id),
  type text not null check (type in ('earning','redemption','adjustment','expiration','refund')),
  points integer not null, -- positive for earning, negative for redemption/expiration
  balance_after integer not null,
  created_at timestamptz not null default now()
);
create index on points_ledger(customer_id, created_at desc);

-- customers.points_balance is a cache of the ledger; this trigger is the
-- Postgres-level guarantee that the two can never drift, mirroring the
-- app-level rule that the ledger is the only source of truth.
create or replace function sync_customer_points_balance()
returns trigger as $$
begin
  update customers set points_balance = new.balance_after where id = new.customer_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_points_balance
  after insert on points_ledger
  for each row execute function sync_customer_points_balance();

create table loyalty_tiers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  min_points integer not null,
  max_points integer,
  discount_pct numeric(5,2) not null default 0
);
create index on loyalty_tiers(tenant_id);

alter table customers add constraint fk_customer_tier foreign key (tier_id) references loyalty_tiers(id);

create table rewards (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  type text not null check (type in ('fixed_discount','percentage_discount','free_service','voucher')),
  points_cost integer not null,
  value numeric(10,2) not null,
  active boolean not null default true
);
create index on rewards(tenant_id);

create table reward_redemptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  reward_id uuid not null references rewards(id),
  code text not null unique,
  qr_code text,
  redeemed_at timestamptz not null default now(),
  staff_id uuid
);

-- ---------------------------------------------------------------------
-- Stamp cards, referrals, vouchers, gift cards
-- ---------------------------------------------------------------------

create table stamp_cards (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service_id uuid not null references services(id),
  stamps_required integer not null default 5,
  stamps_collected integer not null default 0,
  created_at timestamptz not null default now(),
  unique (customer_id, service_id)
);

create table stamp_transactions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  stamp_card_id uuid not null references stamp_cards(id) on delete cascade,
  transaction_id uuid references transactions(id),
  type text not null check (type in ('stamp_earned','card_redeemed')),
  created_at timestamptz not null default now()
);

create table referrals (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  referrer_customer_id uuid not null references customers(id),
  referred_customer_id uuid not null references customers(id),
  referrer_points_awarded integer not null,
  referred_points_awarded integer not null,
  created_at timestamptz not null default now()
);

create table vouchers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed','percentage')),
  value numeric(10,2) not null,
  expiry date not null,
  used boolean not null default false,
  used_at timestamptz,
  qr_code text,
  created_at timestamptz not null default now()
);

create table gift_cards (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null unique,
  initial_value numeric(10,2) not null,
  balance numeric(10,2) not null,
  purchaser_name text,
  recipient_customer_id uuid references customers(id),
  qr_code text,
  sold_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Campaigns, automation, notifications, messaging
-- ---------------------------------------------------------------------

create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  trigger text not null check (trigger in ('inactive_30d','birthday','spend_threshold','points_threshold','nth_visit')),
  trigger_value integer not null,
  action text not null check (action in ('send_voucher','send_notification')),
  action_config jsonb not null,
  active boolean not null default true
);
create index on campaigns(tenant_id);

create table automation_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, campaign_id) -- a campaign only fires once per customer
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  campaign_id uuid references campaigns(id),
  message text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);
create index on notifications(customer_id, created_at desc);

create table message_templates (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('whatsapp','sms','email')),
  subject text,
  body text not null,
  active boolean not null default true
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','sms','email')),
  template_id uuid references message_templates(id),
  campaign_id uuid references campaigns(id),
  body text not null,
  status text not null check (status in ('sent','failed','skipped_no_consent')),
  provider text not null,
  created_at timestamptz not null default now()
);
create index on messages(tenant_id, created_at desc);

create table wallet_passes (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  provider text not null check (provider in ('apple','google')),
  serial_number text not null unique,
  last_synced_at timestamptz not null default now(),
  unique (customer_id, provider)
);

-- ---------------------------------------------------------------------
-- Segments (computed, but persisted for AI suggestion history), billing, tokens
-- ---------------------------------------------------------------------

create table customer_segments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text
);

create table subscriptions (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  plan text not null check (plan in ('starter','scale','pro')) default 'starter',
  monthly_token_limit integer not null default 2000,
  status text not null check (status in ('active','past_due','canceled')) default 'active'
);

create table usage_tokens (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  action text not null check (action in ('loyalty_transaction','whatsapp_message','sms_message','email_message','ai_analysis','wallet_update')),
  tokens integer not null,
  created_at timestamptz not null default now()
);
create index on usage_tokens(tenant_id, created_at desc);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security — tenant isolation
--
-- These policies apply once requests carry a Supabase Auth JWT with a
-- `tenant_id` custom claim (added when auth is wired in). The service
-- role key used by the app's server today bypasses RLS entirely, so
-- these are inert until that point but are here so the data layer is
-- never accidentally exposed once client-side/auth'd access is added.
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'app_users','customers','vehicles','services','transactions',
      'points_ledger','loyalty_tiers','rewards','reward_redemptions','stamp_cards',
      'stamp_transactions','referrals','vouchers','gift_cards','campaigns',
      'automation_events','notifications','message_templates','messages','wallet_passes',
      'customer_segments','usage_tokens','audit_logs'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy tenant_isolation_%1$I on %1$I using (tenant_id = (auth.jwt() ->> ''tenant_id'')::uuid)',
      t
    );
  end loop;
end $$;

-- transaction_items has no tenant_id of its own — it's scoped through its
-- parent transaction, so its policy joins to transactions instead.
alter table transaction_items enable row level security;
create policy tenant_isolation_transaction_items on transaction_items
  using (
    exists (
      select 1 from transactions
      where transactions.id = transaction_items.transaction_id
      and transactions.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- subscriptions is keyed by tenant_id directly rather than having its own id
alter table subscriptions enable row level security;
create policy tenant_isolation_subscriptions on subscriptions
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
