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

-- 2. Tabla fixed_expense_templates: clasificación, datos de tarjeta y monto variable
alter table public.fixed_expense_templates
  add column if not exists fixed_expense_type         text,
  add column if not exists credit_type                text,
  add column if not exists is_credit_card             boolean,
  add column if not exists cut_day                    integer,
  add column if not exists payment_due_days_after_cut integer,
  add column if not exists minimum_payment            numeric,
  add column if not exists variable_amount            boolean default false;

-- 3. Reparación de membresías: reclamar tu propia fila conociendo space+member
create or replace function public.claim_member_profile(
  p_space_id  text,
  p_member_id text
) returns void language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.space_members
  set profile_id = v_uid
  where id        = p_member_id
    and space_id  = p_space_id
    and profile_id is null;
end;
$$;

grant execute on function public.claim_member_profile to authenticated;

-- 4. Recuperación automática SIN hints: re-vincula los espacios que posees
--    usando spaces.owner_id = auth.uid(). Evita pérdida de listas al re-login.
create or replace function public.recover_my_spaces()
returns integer language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.space_members m
  set profile_id = v_uid
  from public.spaces s
  where m.space_id   = s.id
    and s.owner_id   = v_uid::text
    and m.role       = 'propietario'
    and m.profile_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.recover_my_spaces to authenticated;
