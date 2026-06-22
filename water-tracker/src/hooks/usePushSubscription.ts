import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlB64ToUint8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

const isPushSupported = typeof window !== 'undefined'
  && 'PushManager' in window
  && 'serviceWorker' in navigator;

export function usePushSubscription(userId: string | null, notifPermission: NotificationPermission) {
  const [subscribed, setSubscribed] = useState(false);

  // On mount / permission change: check browser subscription and re-upsert to Supabase.
  // This re-registers endpoints that the push service invalidated and the Edge Function deleted.
  useEffect(() => {
    if (!isPushSupported || notifPermission !== 'granted') return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(async sub => {
        if (!sub) { setSubscribed(false); return; }
        setSubscribed(true);
        if (!userId || !isSupabaseConfigured || !supabase) return;
        const json = sub.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } };
        if (!json.keys) return;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await supabase.from('push_subscriptions').upsert({
          user_id: userId,
          endpoint: json.endpoint,
          p256dh:   json.keys.p256dh,
          auth:     json.keys.auth,
          timezone,
        }, { onConflict: 'endpoint' });
      })
      .catch(() => {/* ignore */});
  }, [notifPermission, userId]);

  async function subscribe(): Promise<boolean> {
    if (!isPushSupported || !VAPID_PUBLIC_KEY || !userId) return false;
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
      });

      const json = sub.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } };
      if (!json.keys) return false;

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await supabase.from('push_subscriptions').upsert({
        user_id:  userId,
        endpoint: json.endpoint,
        p256dh:   json.keys.p256dh,
        auth:     json.keys.auth,
        timezone,
      }, { onConflict: 'endpoint' });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('[push] subscribe failed:', err);
      return false;
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!isPushSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (isSupabaseConfigured && supabase) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[push] unsubscribe failed:', err);
    }
  }

  return { subscribed, isPushSupported, subscribe, unsubscribe };
}
