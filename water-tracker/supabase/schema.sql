-- AquaVital – Water Intake Tracker
-- Run this in your Supabase SQL Editor

-- User profiles with hydration settings
create table if not exists water_profiles (
  id            uuid primary key references auth.users on delete cascade,
  weight_kg     float    not null,
  activity_level text    not null default 'sedentary',
  wake_time     text     not null default '06:00',
  sleep_time    text     not null default '22:00',
  glass_size_ml int      not null default 250,
  daily_goal_ml int      not null default 2000,
  streak_data   jsonb    default null,
  updated_at    timestamptz default now()
);

-- Migration: add streak_data if upgrading from earlier schema
alter table water_profiles add column if not exists streak_data jsonb default null;

-- Daily water intake logs
create table if not exists water_intake (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  amount_ml  int  not null check (amount_ml > 0 and amount_ml <= 5000),
  logged_at  timestamptz not null default now()
);

-- Row-level security
alter table water_profiles enable row level security;
alter table water_intake    enable row level security;

create policy "own profile" on water_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own intake" on water_intake
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Index for fast daily queries
create index if not exists water_intake_user_day
  on water_intake (user_id, logged_at);

-- Journal entries (expectations & weekly reflections)
create table if not exists water_journal (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  week_number  int  not null,
  entry_type   text not null check (entry_type in ('expectation', 'weekly_reflection')),
  content      text not null,
  created_at   timestamptz not null default now()
);

alter table water_journal enable row level security;

create policy "own journal" on water_journal
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists water_journal_user
  on water_journal (user_id, created_at);
