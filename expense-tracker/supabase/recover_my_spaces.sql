-- ============================================================
-- Orden Casa — Recuperación automática de espacios propios
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================
--
-- Por qué existe esta función:
--   Cuando la fila del propietario en space_members tiene profile_id = NULL
--   O no existe ninguna fila en space_members para el espacio,
--   my_space_ids() regresa vacío y el usuario "pierde" acceso a sus listas.
--
--   Esta función NO necesita hints: usa spaces.owner_id (que siempre guarda
--   el auth.uid del creador) para re-vincular o crear la fila de propietario.
--   Es segura porque:
--     • Solo afecta espacios donde owner_id = auth.uid() del que llama.
--     • Fix 1 solo actualiza filas con profile_id IS NULL.
--     • Fix 2 solo inserta si NO existe ya una fila vinculada a este usuario.
--     • Idempotente: ejecutarla varias veces no tiene efectos extra.

create or replace function public.recover_my_spaces()
returns integer language plpgsql security definer as $$
declare
  v_uid          uuid := auth.uid();
  v_display_name text;
  v_count        integer := 0;
  v_inserted     integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Obtener nombre de perfil para usarlo en filas nuevas
  select display_name into v_display_name
  from public.profiles where id = v_uid;

  -- Fix 1: Actualizar filas de propietario que existen pero tienen profile_id = NULL
  update public.space_members m
  set profile_id = v_uid
  from public.spaces s
  where m.space_id   = s.id
    and s.owner_id   = v_uid::text
    and m.role       = 'propietario'
    and m.profile_id is null;

  get diagnostics v_count = row_count;

  -- Fix 2: Insertar fila de propietario para espacios que no tienen NINGUNA
  --        fila en space_members vinculada a este usuario
  insert into public.space_members (id, space_id, profile_id, display_name, role, created_at)
  select
    'mb_recovered_' || s.id,
    s.id,
    v_uid,
    coalesce(v_display_name, 'Propietario'),
    'propietario',
    now()
  from public.spaces s
  where s.owner_id = v_uid::text
    and not exists (
      select 1 from public.space_members sm
      where sm.space_id  = s.id
        and sm.profile_id = v_uid
    )
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;
  v_count := v_count + v_inserted;

  return v_count;
end;
$$;

grant execute on function public.recover_my_spaces to authenticated;
