-- ============================================================
-- Orden Casa — Migración: clasificación de gastos fijos (crédito vs servicio)
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================

alter table public.fixed_expense_templates
  add column if not exists fixed_expense_type text,   -- 'credito' | 'servicio'
  add column if not exists credit_type        text;   -- 'tarjeta_credito' | 'credito_automotriz' | etc.
