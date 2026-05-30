-- Función server-side para crear un espacio y sus miembros en una sola llamada.
-- Usa SECURITY DEFINER para tener permisos de escritura, pero verifica
-- auth.uid() explícitamente antes de insertar.
create or replace function public.create_space_with_members(
  p_id         text,
  p_name       text,
  p_max_members integer,
  p_plan       text,
  p_created_at text,
  p_members    jsonb   -- [{id, display_name, pin, role, color_index, created_at, is_owner}]
) returns void language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  m     jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated: auth.uid() is null';
  end if;

  insert into public.spaces (id, name, owner_id, max_members, plan, created_at)
  values (p_id, p_name, v_uid::text, p_max_members, coalesce(p_plan, 'trial'), p_created_at)
  on conflict (id) do update
    set name = excluded.name, max_members = excluded.max_members;

  for m in select * from jsonb_array_elements(p_members) loop
    insert into public.space_members
      (id, space_id, profile_id, display_name, pin, role, color_index, created_at)
    values (
      m->>'id',
      p_id,
      case when (m->>'is_owner')::boolean then v_uid else null end,
      m->>'display_name',
      coalesce(m->>'pin', '0000'),
      coalesce(m->>'role', 'editor'),
      (m->>'color_index')::integer,
      m->>'created_at'
    )
    on conflict (id) do update
      set display_name = excluded.display_name,
          -- preserve existing profile_id if new one is null (don't unlink)
          profile_id = coalesce(excluded.profile_id, space_members.profile_id);
  end loop;
end;
$$;

-- Permitir que cualquier usuario autenticado llame a esta función
grant execute on function public.create_space_with_members to authenticated;
