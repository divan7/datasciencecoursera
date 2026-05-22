-- ============================================================
-- Orden Casa by SOIHogar — Supabase Schema
-- Run this in the Supabase SQL Editor (project → SQL Editor → New query)
-- ============================================================

-- ─── 1. Profiles (extends auth.users) ─────────────────────────
create table if not exists public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  email           text not null default '',
  display_name    text not null default 'Usuario',
  plan            text not null default 'trial' check (plan in ('free','trial','premium')),
  plan_expires_at timestamptz,
  is_admin        boolean not null default false,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1), 'Usuario')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ─── 2. Spaces ─────────────────────────────────────────────────
create table if not exists public.spaces (
  id          text primary key,
  name        text not null,
  owner_id    text not null,
  max_members integer not null default 5,
  plan        text not null default 'trial',
  created_at  text not null default to_char(now(), 'YYYY-MM-DD')
);
alter table public.spaces enable row level security;

-- ─── 3. Space members ──────────────────────────────────────────
create table if not exists public.space_members (
  id          text primary key,
  space_id    text references public.spaces(id) on delete cascade not null,
  profile_id  uuid references public.profiles(id) on delete set null,
  display_name text not null,
  pin         text not null default '0000',
  role        text not null default 'editor',
  color_index integer not null default 0,
  created_at  text not null default to_char(now(), 'YYYY-MM-DD')
);
alter table public.space_members enable row level security;

-- Helper: returns space IDs the current user belongs to
create or replace function public.my_space_ids()
returns setof text language sql security definer stable as $$
  select space_id from public.space_members where profile_id = auth.uid();
$$;

-- ─── 4. Expenses ───────────────────────────────────────────────
create table if not exists public.expenses (
  id                    text primary key,
  space_id              text references public.spaces(id) on delete cascade not null,
  date                  text not null,
  transaction_type      text not null default 'gasto',
  amount                numeric(12,2) not null,
  currency              text not null default 'MXN',
  paid_by               text not null,
  concept               text not null,
  category              text not null,
  subcategory           text,
  payment_method        text not null,
  card_last4            text,
  bank                  text,
  store                 text,
  location              text,
  expense_type          text not null default 'variable',
  frequency             text,
  installments          integer,
  current_installment   integer,
  is_reimbursable       boolean,
  is_tax_deductible     boolean,
  invoice_requested     boolean,
  shared_expense        boolean,
  notes                 text,
  tags                  text[],
  receipt_image_base64  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.expenses enable row level security;

-- ─── 5. Fixed expense templates ────────────────────────────────
create table if not exists public.fixed_expense_templates (
  id                    text primary key,
  space_id              text references public.spaces(id) on delete cascade not null,
  concept               text not null,
  expected_amount       numeric(12,2) not null default 0,
  category              text,
  payment_method        text,
  paid_by               text,
  bank                  text,
  card_last4            text,
  frequency             text not null default 'mensual',
  expense_type          text not null default 'fijo',
  active                boolean not null default true,
  day_of_month          integer,
  day_of_week           integer,
  payment_month         integer,
  reminder_enabled      boolean not null default false,
  reminder_days_before  integer not null default 3,
  notes                 text,
  created_at            text not null default to_char(now(), 'YYYY-MM-DD'),
  updated_at            timestamptz not null default now()
);
alter table public.fixed_expense_templates enable row level security;

-- ─── 6. Fixed expense checks ───────────────────────────────────
create table if not exists public.fixed_expense_checks (
  id            text primary key,
  space_id      text references public.spaces(id) on delete cascade not null,
  template_id   text references public.fixed_expense_templates(id) on delete cascade not null,
  month         text not null,
  status        text not null default 'pendiente',
  expense_id    text references public.expenses(id) on delete set null,
  actual_amount numeric(12,2),
  confirmed_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  unique(template_id, month)
);
alter table public.fixed_expense_checks enable row level security;

-- ─── 7. Space settings ─────────────────────────────────────────
create table if not exists public.space_settings (
  space_id           text references public.spaces(id) on delete cascade primary key,
  currency           text not null default 'MXN',
  anthropic_api_key  text,
  updated_at         timestamptz not null default now()
);
alter table public.space_settings enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
create policy "Own profile readable" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "Own profile updatable" on public.profiles
  for update using (id = auth.uid());

-- spaces
create policy "Members read spaces" on public.spaces
  for select using (id in (select public.my_space_ids()));
create policy "Auth users create spaces" on public.spaces
  for insert with check (auth.uid() is not null);
create policy "Members update spaces" on public.spaces
  for update using (id in (select public.my_space_ids()));
create policy "Members delete spaces" on public.spaces
  for delete using (id in (select public.my_space_ids()));

-- space_members
create policy "Members read space_members" on public.space_members
  for select using (space_id in (select public.my_space_ids()));
create policy "Members insert space_members" on public.space_members
  for insert with check (space_id in (select public.my_space_ids()));
create policy "Members update space_members" on public.space_members
  for update using (space_id in (select public.my_space_ids()));
create policy "Members delete space_members" on public.space_members
  for delete using (space_id in (select public.my_space_ids()));

-- expenses
create policy "Members read expenses" on public.expenses
  for select using (space_id in (select public.my_space_ids()));
create policy "Members insert expenses" on public.expenses
  for insert with check (space_id in (select public.my_space_ids()));
create policy "Members update expenses" on public.expenses
  for update using (space_id in (select public.my_space_ids()));
create policy "Members delete expenses" on public.expenses
  for delete using (space_id in (select public.my_space_ids()));

-- fixed_expense_templates
create policy "Members read templates" on public.fixed_expense_templates
  for select using (space_id in (select public.my_space_ids()));
create policy "Members insert templates" on public.fixed_expense_templates
  for insert with check (space_id in (select public.my_space_ids()));
create policy "Members update templates" on public.fixed_expense_templates
  for update using (space_id in (select public.my_space_ids()));
create policy "Members delete templates" on public.fixed_expense_templates
  for delete using (space_id in (select public.my_space_ids()));

-- fixed_expense_checks
create policy "Members read checks" on public.fixed_expense_checks
  for select using (space_id in (select public.my_space_ids()));
create policy "Members insert checks" on public.fixed_expense_checks
  for insert with check (space_id in (select public.my_space_ids()));
create policy "Members update checks" on public.fixed_expense_checks
  for update using (space_id in (select public.my_space_ids()));
create policy "Members delete checks" on public.fixed_expense_checks
  for delete using (space_id in (select public.my_space_ids()));

-- space_settings
create policy "Members read settings" on public.space_settings
  for select using (space_id in (select public.my_space_ids()));
create policy "Members upsert settings" on public.space_settings
  for insert with check (space_id in (select public.my_space_ids()));
create policy "Members update settings" on public.space_settings
  for update using (space_id in (select public.my_space_ids()));

-- ============================================================
-- INDEXES (for performance with many users)
-- ============================================================
create index if not exists idx_space_members_profile on public.space_members(profile_id);
create index if not exists idx_space_members_space   on public.space_members(space_id);
create index if not exists idx_expenses_space        on public.expenses(space_id);
create index if not exists idx_expenses_date         on public.expenses(date);
create index if not exists idx_templates_space       on public.fixed_expense_templates(space_id);
create index if not exists idx_checks_template       on public.fixed_expense_checks(template_id);
create index if not exists idx_checks_space          on public.fixed_expense_checks(space_id);
