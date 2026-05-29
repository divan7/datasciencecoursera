-- ============================================================
-- Orden Casa — Migración: campos de tarjeta de crédito en gastos fijos
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================

alter table public.fixed_expense_templates
  add column if not exists is_credit_card             boolean,
  add column if not exists cut_day                    integer,
  add column if not exists payment_due_days_after_cut integer,
  add column if not exists minimum_payment            numeric(12,2);
