-- ============================================================
-- Orden Casa — Migración: ticket_notes para comentario general del ticket
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================

alter table public.expenses
  add column if not exists ticket_notes text;
