-- ============================================================
-- Orden Casa — Migración: API key en perfil de usuario
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================

-- Agrega columna anthropic_api_key al perfil del usuario
-- (si ya existe, no hace nada)
alter table public.profiles
  add column if not exists anthropic_api_key text;
