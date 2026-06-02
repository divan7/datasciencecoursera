-- ============================================================
-- Orden Casa — Reclamar perfil en miembro existente
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================
--
-- Por qué existe esta función:
--   Espacios creados antes de la corrección del flujo de alta via Settings
--   quedaron con profile_id = NULL en space_members. Eso bloquea my_space_ids()
--   y por ende todas las políticas RLS (space_invites, expenses, etc.).
--
--   Esta función SECURITY DEFINER permite que el usuario autenticado "reclame"
--   su propio registro de miembro asignando profile_id = auth.uid().
--   Es segura porque:
--     • Solo puede asignar auth.uid() propio — no puede poner otro UID.
--     • Solo actualiza si profile_id IS NULL — no puede robar miembros de otros.
--     • Requiere conocer tanto space_id como member_id.

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
