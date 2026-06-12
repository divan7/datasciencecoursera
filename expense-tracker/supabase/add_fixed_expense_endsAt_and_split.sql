-- Migration: add ends_at and default_split to fixed_expense_templates
-- Run this in the Supabase SQL editor

alter table public.fixed_expense_templates
  add column if not exists ends_at date,
  add column if not exists default_split jsonb;

-- ends_at: optional expiry date. Templates with ends_at < current month are excluded
--   from monthly checks by isDueInMonth() in the app.
-- default_split: JSONB with shape { mode: 'equal'|'percent'|'amount', entries: [{name, value}] }
--   Pre-populates the split modal when confirming a fixed payment.
