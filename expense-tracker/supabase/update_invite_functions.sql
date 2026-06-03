-- ============================================================
-- Orden Casa — Actualización del flujo de invitaciones
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================

-- Actualiza preview_invite para también devolver los miembros del espacio
create or replace function public.preview_invite(p_code text)
returns json language plpgsql security definer stable as $$
declare
  v_invite record;
  v_members json;
begin
  select space_id, space_name
  into v_invite
  from public.space_invites
  where upper(code) = upper(p_code)
    and expires_at > now()
    and use_count < max_uses;

  if not found then return null; end if;

  select json_agg(
    json_build_object(
      'id',         id,
      'name',       display_name,
      'colorIndex', color_index,
      'hasProfile', profile_id is not null
    )
    order by created_at
  )
  into v_members
  from public.space_members
  where space_id = v_invite.space_id;

  return json_build_object(
    'spaceId',   v_invite.space_id,
    'spaceName', v_invite.space_name,
    'members',   coalesce(v_members, '[]'::json)
  );
end;
$$;

-- Nueva función: vincularse a un miembro ya existente en lugar de crear uno nuevo
create or replace function public.join_as_existing_member(
  p_code      text,
  p_member_id text
) returns json language plpgsql security definer as $$
declare
  v_invite record;
  v_uid    uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_invite
  from public.space_invites
  where upper(code) = upper(p_code)
    and expires_at > now()
    and use_count < max_uses;

  if not found then
    raise exception 'Código inválido o expirado';
  end if;

  -- Verificar que el miembro pertenece a este espacio
  perform 1 from public.space_members
  where id = p_member_id and space_id = v_invite.space_id;
  if not found then
    raise exception 'Miembro no válido para este espacio';
  end if;

  -- Verificar que no haya otra cuenta ya vinculada a ese miembro
  -- (profile_id diferente del usuario actual)
  if exists (
    select 1 from public.space_members
    where id = p_member_id
      and profile_id is not null
      and profile_id <> v_uid
  ) then
    raise exception 'Ese perfil ya tiene una cuenta vinculada';
  end if;

  -- Vincular el miembro existente a este profile
  update public.space_members
  set profile_id = v_uid
  where id = p_member_id;

  -- Incrementar contador de uso
  update public.space_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  return json_build_object(
    'success',  true,
    'spaceId',  v_invite.space_id,
    'memberId', p_member_id
  );
end;
$$;
