# Contexto del proyecto — Orden Casa

## Stack
- React 19 + TypeScript + Vite + Tailwind CSS v4
- Supabase (Postgres + Auth + RLS + Edge Functions)
- Desplegado en Vercel desde rama `main` del repo `divan7/datasciencecoursera`
- PWA con service worker (vite-plugin-pwa)

## Rama de desarrollo activa
`claude/expense-tracker-app-T6NmB` → siempre hacer push también a `master` y `main`

## Usuario principal
- email: ivan.porraz@gmail.com
- profile_id: e2e1d38b-96b0-4ea8-83f0-5c023a08679a
- is_admin: true, plan: trial

---

## Temas pendientes

### experiencia_inicial
**Contexto:** Se discutió mejorar el flujo de onboarding y el sistema de PIN/invitaciones.

**Problema identificado:**
- La app tiene dos modos: local (sin Supabase, solo localStorage + PIN) y nube (Supabase + cuentas)
- El usuario nuevo no sabe que puede elegir entre ambos
- El flujo de invitación existe (código de 6 chars en JoinSpace) pero está poco visible
- El PIN hoy sirve solo para cambiar de miembro en un dispositivo compartido

**Opciones discutidas:**
- A) Mantener los dos modos y mejorar onboarding para que el usuario elija conscientemente ("solo este dispositivo" vs "cuenta en la nube")
- B) Solo mejorar el flujo de invitación en modo Supabase, dejando modo local como está
- C) Siempre Supabase + mejorar invitación + PIN opcional

**Decisión pendiente:** El usuario quiere pensarlo. Retomar cuando lo indique con la palabra clave `experiencia_inicial`.

**Plan listo para implementar (opción aprobada parcialmente):**
Si se elige modo Supabase mejorado:
1. Botón "Invitar" en SpaceSettings junto a cada miembro sin cuenta vinculada
2. Banner post-creación de espacio con links de invitación por miembro
3. PIN queda opcional en creación de miembros (no se elimina de UserSwitcher)

---

### pagos_premium
**Contexto:** Módulo de pago para migrar licencia free → premium.

**Gateways evaluados:** MercadoPago (recomendado para México/LATAM), Stripe (mejor para internacional), PayPal (secundario).

**Decisión pendiente:**
1. ¿Suscripción mensual/anual o pago único?
2. ¿Moneda MXN, USD o ambas?
3. ¿Ya tiene cuenta de MercadoPago o Stripe para desarrollo?

Retomar cuando el usuario lo indique.
