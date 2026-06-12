-- ============================================================
-- Orden Casa — Migración: funcionalidades de IA y admin global
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- Es seguro ejecutarlo múltiples veces (usa IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- 1. Columna ai_enabled en profiles
--    null  = usar el default global de la app
--    true  = forzar acceso a IA para este usuario
--    false = bloquear acceso a IA para este usuario
alter table public.profiles
  add column if not exists ai_enabled boolean default null;

-- 2. Tabla app_settings: configuración global de la app (solo admins escriben)
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

-- RLS: todos los usuarios autenticados pueden leer; solo admins pueden escribir
alter table public.app_settings enable row level security;

drop policy if exists "Authenticated read app_settings" on public.app_settings;
create policy "Authenticated read app_settings" on public.app_settings
  for select using (auth.uid() is not null);

drop policy if exists "Admin write app_settings" on public.app_settings;
create policy "Admin write app_settings" on public.app_settings
  for all using (public.is_admin());

-- 3. Valores iniciales (no sobreescribe si ya existen)
insert into public.app_settings (key, value, updated_at)
values
  ('ai_default_enabled', 'true', now()),
  ('anthropic_api_key',  '',     now())
on conflict (key) do nothing;
