-- ============================================================
-- Orden Casa — Recuperación automática de espacios propios
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================
--
-- Por qué existe esta función:
--   Cuando la fila del propietario en space_members tiene profile_id = NULL,
--   my_space_ids() regresa vacío y el usuario "pierde" acceso a sus listas
--   aunque los datos siguen en la base. claim_member_profile requería conocer
--   space_id + member_id (hints locales que se pierden al cerrar sesión).
--
--   Esta función NO necesita hints: usa spaces.owner_id (que siempre guarda
--   el auth.uid del creador) para re-vincular la fila de propietario.
--   Es segura porque:
--     • Solo afecta espacios donde owner_id = auth.uid() del que llama.
--     • Solo actualiza filas con profile_id IS NULL (no roba membresías).
--     • Idempotente: ejecutarla varias veces no tiene efectos extra.

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
