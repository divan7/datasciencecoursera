-- ============================================================
-- Orden Casa — Migración: obligations para prorrateo por persona
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================

alter table public.expenses
  add column if not exists obligations jsonb;

-- También agrega invoice_status y fiscal_notes si no existen
alter table public.expenses
  add column if not exists invoice_status text;

alter table public.expenses
  add column if not exists fiscal_notes text;
