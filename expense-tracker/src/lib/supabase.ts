import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured =
  Boolean(url && key && !url.includes('tu-proyecto'));

// Detect if the app is running as an installed PWA (standalone mode).
// navigator.locks can deadlock indefinitely in iOS standalone PWAs, so we
// replace it with a simple promise-queue only in that scenario.
const isStandalonePWA =
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true));

const lockQueue = new Map<string, Promise<void>>();
function inProcessLock<R>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> {
  const prev = lockQueue.get(_name) ?? Promise.resolve();
  let resolve!: () => void;
  const gate = new Promise<void>((r) => { resolve = r; });
  lockQueue.set(_name, gate);
  return prev.then(
    () => fn().finally(resolve),
    () => fn().finally(resolve),
  );
}

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          detectSessionInUrl: true,
          ...(isStandalonePWA ? { lock: inProcessLock } : {}),
        },
      })
    : null;
