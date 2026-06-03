-- ============================================================
-- Orden Casa — Invitaciones por código
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================

-- ─── Tabla de invitaciones ─────────────────────────────────────
create table if not exists public.space_invites (
  id          text primary key,
  space_id    text references public.spaces(id) on delete cascade not null,
  space_name  text not null,
  code        text unique not null,
  created_by  text not null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  max_uses    integer not null default 20,
  use_count   integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.space_invites enable row level security;

create policy "Members manage invites" on public.space_invites
  for all
  using  (space_id in (select public.my_space_ids()))
  with check (space_id in (select public.my_space_ids()));

-- ─── Previsualizar invitación (sin ser miembro aún) ────────────
create or replace function public.preview_invite(p_code text)
returns json language plpgsql security definer stable as $$
declare
  v record;
begin
  select space_id, space_name
  into v
  from public.space_invites
  where upper(code) = upper(p_code)
    and expires_at > now()
    and use_count < max_uses;

  if not found then return null; end if;

  return json_build_object('spaceId', v.space_id, 'spaceName', v.space_name);
end;
$$;

-- ─── Unirse a un espacio usando el código ──────────────────────
create or replace function public.join_space_with_code(
  p_code         text,
  p_display_name text,
  p_color_index  integer default 0
) returns json language plpgsql security definer as $$
declare
  v_invite    record;
  v_member_id text;
  v_uid       uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Buscar invitación válida
  select * into v_invite
  from public.space_invites
  where upper(code) = upper(p_code)
    and expires_at > now()
    and use_count < max_uses;

  if not found then
    raise exception 'Código inválido o expirado';
  end if;

  -- Verificar que no sea ya miembro
  if exists (
    select 1 from public.space_members
    where space_id = v_invite.space_id and profile_id = v_uid
  ) then
    raise exception 'Ya eres miembro de esta lista';
  end if;

  -- Generar ID de miembro
  v_member_id := 'mb_' || to_hex(floor(extract(epoch from now()) * 1000)::bigint)
                        || '_' || substr(md5(random()::text), 1, 5);

  -- Agregar miembro
  insert into public.space_members (id, space_id, profile_id, display_name, pin, role, color_index)
  values (v_member_id, v_invite.space_id, v_uid, p_display_name, '0000', 'editor', p_color_index);

  -- Incrementar contador
  update public.space_invites set use_count = use_count + 1 where id = v_invite.id;

  return json_build_object(
    'success',  true,
    'spaceId',  v_invite.space_id,
    'memberId', v_member_id
  );
end;
$$;
