-- ============================================================
-- Orden Casa — BORRÓN Y CUENTA NUEVA (wipe de datos de prueba)
-- ============================================================
-- Ejecuta esto en Supabase → SQL Editor → New query.
--
-- ⚠️  ESTO BORRA TODOS LOS DATOS DE LA APP (espacios, miembros,
--     gastos, plantillas, ajustes e invitaciones). NO toca el
--     esquema ni las políticas RLS — la estructura queda intacta.
--
-- Los PERFILES y USUARIOS de Auth NO se borran aquí. Para eliminarlos
-- ve al final de este archivo (paso 2).
-- ============================================================

-- ── Paso 1: vaciar las tablas de datos ──────────────────────
-- TRUNCATE ... CASCADE limpia las tablas hijas automáticamente,
-- pero las listamos todas para que sea explícito y reiniciamos
-- cualquier secuencia.
truncate table
  public.expenses,
  public.fixed_expense_checks,
  public.fixed_expense_templates,
  public.space_settings,
  public.space_members,
  public.space_invites,
  public.spaces
restart identity cascade;

-- ── (Opcional) Paso 1b: borrar también los perfiles ────────
-- Solo si quieres limpiar los perfiles SIN borrar las cuentas de
-- Auth. Normalmente NO hace falta: si borras los usuarios en el
-- dashboard (paso 2), sus perfiles se eliminan en cascada y se
-- vuelven a crear solos al registrarse de nuevo. Descomenta solo
-- si sabes lo que haces:
--
-- delete from public.profiles where is_admin = false;

-- ============================================================
-- Paso 2 (en el Dashboard, NO en SQL):
--   Authentication → Users → selecciona los usuarios de prueba →
--   "Delete user". Esto borra la cuenta y, en cascada, su perfil.
--   Después cada quien se registra de cero con correo + contraseña.
--
-- Paso 3 (recomendado, una sola vez):
--   Authentication → Providers → Email → desactiva
--   "Confirm email" para que el registro con contraseña sea
--   instantáneo (sin correo de confirmación). Así no dependes
--   del enlace por correo ni de límites de envío.
-- ============================================================
