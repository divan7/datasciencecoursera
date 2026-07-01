# Contexto del proyecto — AquaVital (Water Tracker)

## Stack
- React 19 + TypeScript + Vite + Tailwind CSS v4
- Supabase (Postgres + Auth + RLS + Edge Functions)
- Desplegado en Vercel (proyecto `water-tracker`) — rama de producción: `claude/water-intake-tracker-app-Oho1f`
- PWA con service worker (vite-plugin-pwa + Workbox)

## Rama de desarrollo activa
**IMPORTANTE:** Hacer push SOLO a `claude/water-intake-tracker-app-Oho1f`. NO hacer push a `master` ni a `main`.

- `claude/water-intake-tracker-app-Oho1f` → dispara deploy automático a producción en Vercel
- `master` y `main` son compartidos con otros proyectos del repo — hacer push ahí puede sobrescribir trabajo de otras apps

## Usuario principal
- email: ivan.porraz@gmail.com
- user_id (water_profiles): 86e45fff-3a84-459c-a245-418b723157b3

## Edge Function
La Edge Function `send-water-reminders` NO se despliega automáticamente desde el repo.
Debe copiarse manualmente al dashboard de Supabase cuando haya cambios.
Archivo local: `supabase/functions/send-water-reminders/index.ts`

## Notas técnicas importantes
- `plan_current_goal_ml` en Supabase se sincroniza desde Dashboard.tsx al cargar la app
  (gateado en `plan.planReady` para no sobrescribir con el valor máximo en el primer render)
- El service worker usa `skipWaiting()` + `clientsClaim()` — se activa inmediatamente en deploy
- Las notificaciones push en foreground van por `postMessage({ type: 'WATER_REMINDER' })` al app
- El auto-log desde notificación usa `postMessage({ type: 'AUTO_LOG' })` si la app está abierta,
  o URL params `/?log=250&slot=HH:MM` si está cerrada
