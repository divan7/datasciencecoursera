-- ============================================================
-- Orden Casa — Trigger: auto-insertar propietario en space_members
-- Ejecuta esto en Supabase SQL Editor → New query → Run
-- ============================================================
--
-- Por qué existe este trigger:
--   Garantiza que cuando se crea un espacio (INSERT en spaces), el propietario
--   siempre tenga una fila en space_members. Previene el estado inconsistente
--   donde spaces.owner_id existe pero no hay fila en space_members vinculada.
--
--   Usa DEFERRABLE INITIALLY DEFERRED para que se ejecute al final de la
--   transacción completa — así el RPC create_space_with_members puede insertar
--   primero sus propias filas de miembros y el trigger solo actúa como red de
--   seguridad cuando faltan.
--
--   Es seguro porque:
--     • El EXISTS check previene insertar si ya hay una fila para ese owner.
--     • ON CONFLICT (id) DO NOTHING evita errores en reintentos.
--     • Solo el owner_id del espacio recibe la fila nueva.

create or replace function public.auto_add_owner_to_space_members()
returns trigger language plpgsql security definer as $$
declare
  v_display_name text;
begin
  -- Solo actuar si no existe ya una fila vinculada al propietario
  if not exists (
    select 1 from public.space_members
    where space_id  = new.id
      and profile_id = new.owner_id::uuid
  ) then
    select display_name into v_display_name
    from public.profiles where id = new.owner_id::uuid;

    insert into public.space_members (id, space_id, profile_id, display_name, role, created_at)
    values (
      'mb_autoowner_' || new.id,
      new.id,
      new.owner_id::uuid,
      coalesce(v_display_name, 'Propietario'),
      'propietario',
      now()
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- Trigger diferido: se ejecuta al final de la transacción, no inmediatamente
-- después del INSERT en spaces. Esto permite que create_space_with_members
-- inserte primero sus filas de miembros sin conflicto.
drop trigger if exists trg_auto_add_owner on public.spaces;

create constraint trigger trg_auto_add_owner
after insert on public.spaces
deferrable initially deferred
for each row execute function public.auto_add_owner_to_space_members();
