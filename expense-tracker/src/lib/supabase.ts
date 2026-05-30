import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured =
  Boolean(url && key && !url.includes('tu-proyecto'));

// In-process lock to replace supabase-js's default Web Locks API (navigator.locks)
// lock. The Web Locks lock can deadlock indefinitely inside installed PWAs
// (notably iOS standalone), which freezes any call that needs to validate or
// refresh the auth token — e.g. an insert — with no error ever thrown.
// This serializes auth operations within the tab using a simple promise queue.
const lockQueue = new Map<string, Promise<unknown>>();
async function inProcessLock<R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const prev = (lockQueue.get(name) ?? Promise.resolve()) as Promise<unknown>;
  const run = prev.then(fn, fn);
  // Keep the chain alive but swallow results so the queue never rejects.
  lockQueue.set(name, run.then(() => undefined, () => undefined));
  return run;
}

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: 'implicit',
          persistSession: true,
          detectSessionInUrl: true,
          lock: inProcessLock,
        },
      })
    : null;
