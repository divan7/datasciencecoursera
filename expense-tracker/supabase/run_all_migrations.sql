-- ============================================================
-- Orden Casa — Migraciones pendientes (ejecuta todo de una vez)
-- Supabase SQL Editor → New query → Run
-- Es seguro ejecutarlo múltiples veces (usa IF NOT EXISTS)
-- ============================================================

-- 1. Tabla expenses: columnas para split/obligaciones y factura
alter table public.expenses
  add column if not exists obligations    jsonb,
  add column if not exists invoice_status text,
  add column if not exists fiscal_notes   text;

-- 2. Tabla fixed_expense_templates: clasificación y datos de tarjeta
alter table public.fixed_expense_templates
  add column if not exists fixed_expense_type         text,
  add column if not exists credit_type                text,
  add column if not exists is_credit_card             boolean,
  add column if not exists cut_day                    integer,
  add column if not exists payment_due_days_after_cut integer,
  add column if not exists minimum_payment            numeric;
