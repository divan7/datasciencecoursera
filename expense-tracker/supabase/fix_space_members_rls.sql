-- ============================================================
-- Orden Casa — FIX CRÍTICO de persistencia
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================
--
-- PROBLEMA:
-- La política de inserción de space_members exigía que el usuario YA fuera
-- miembro del espacio (space_id in my_space_ids()). Pero al crear un espacio
-- nuevo todavía no eres miembro, así que la inserción de tu PROPIA membresía
-- (la del dueño) era bloqueada por RLS. Como consecuencia:
--   • La fila del dueño nunca se creaba → profile_id = auth.uid() no existía
--   • my_space_ids() quedaba vacío → TODA escritura de gastos/fijos/checks
--     a Supabase fallaba en silencio
--   • Los datos solo vivían en localStorage y se perdían al limpiar caché
--   • Al re-loguearse, listMySpaces() regresaba vacío
--
-- SOLUCIÓN:
-- Permitir que un usuario inserte una membresía que lo vincula a SÍ MISMO
-- (profile_id = auth.uid()), de modo que el dueño pueda "bootstrap" su espacio.
-- Los miembros ya existentes siguen pudiendo agregar a otros.
-- ============================================================

drop policy if exists "Members insert space_members" on public.space_members;

create policy "Members insert space_members" on public.space_members
  for insert with check (
    profile_id = auth.uid()                          -- agregarte a ti mismo (dueño nuevo)
    or space_id in (select public.my_space_ids())    -- miembros existentes agregan a otros
  );
