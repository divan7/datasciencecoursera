-- ============================================================
-- Orden Casa — Migración: ticket_id para agrupar ítems de un mismo ticket
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================

alter table public.expenses
  add column if not exists ticket_id text;

-- Índice para que las consultas de agrupación sean rápidas
create index if not exists idx_expenses_ticket_id
  on public.expenses (ticket_id)
  where ticket_id is not null;
