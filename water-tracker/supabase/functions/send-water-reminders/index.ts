// Supabase Edge Function — runs every minute via pg_cron
// Sends Web Push notifications to users whose scheduled slot matches now
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

// ── Utility: replicate frontend schedule formula ──────────────────────────────

function dailyGlasses(goalMl: number, sizeMl: number): number {
  return Math.ceil(goalMl / sizeMl);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildSchedule(goalMl: number, sizeMl: number, wake: string, sleep: string): string[] {
  const glasses  = dailyGlasses(goalMl, sizeMl);
  const wakeMin  = timeToMinutes(wake);
  const sleepMin = timeToMinutes(sleep);
  const available = sleepMin - wakeMin - 60;
  const interval  = glasses > 1 ? Math.floor(available / (glasses - 1)) : available;
  return Array.from({ length: glasses }, (_, i) => minutesToTime(wakeMin + i * interval));
}

// ── Web Push via web-push library ─────────────────────────────────────────────

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ivan.porraz@gmail.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<number> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
    return 201;
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    console.error('[push] error:', e.statusCode, JSON.stringify(err));
    return e.statusCode ?? 500;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function localMinutes(utc: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(utc);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value  ?? '0') % 24;
    const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
    return h * 60 + m;
  } catch {
    return utc.getHours() * 60 + utc.getMinutes();
  }
}

Deno.serve(async (req) => {
  const utcNow = new Date();
  let force = false;
  try { const body = await req.json(); force = body.force === true; } catch { /* ignore */ }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (subsError || !subs?.length) {
    return new Response(JSON.stringify({ sent: 0, error: subsError?.message }), { status: 200 });
  }

  const userIds = [...new Set(subs.map((s: { user_id: string }) => s.user_id))];
  const { data: profiles } = await supabase
    .from('water_profiles')
    .select('id, glass_size_ml, daily_goal_ml, plan_current_goal_ml, wake_time, sleep_time')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: {
      id: string; glass_size_ml: number; daily_goal_ml: number;
      plan_current_goal_ml: number | null; wake_time: string; sleep_time: string;
    }) => [p.id, p])
  );

  let sent = 0;
  console.log('[push] total subs:', subs.length, '| force:', force);

  for (const sub of subs) {
    const profile = profileMap.get(sub.user_id) ?? null;
    console.log('[push] sub id:', sub.id, 'user:', sub.user_id.slice(0,8), 'tz:', sub.timezone, 'profile?', !!profile);
    if (!profile) continue;

    const localMin = localMinutes(utcNow, sub.timezone);
    const goalMl   = profile.plan_current_goal_ml ?? profile.daily_goal_ml;
    const schedule = buildSchedule(goalMl, profile.glass_size_ml, profile.wake_time, profile.sleep_time);

    const slotIdx = force ? 0 : schedule.findIndex(t => timeToMinutes(t) === localMin);
    if (!force && slotIdx === -1) continue;

    const windowStart = new Date(utcNow.getTime() - 13 * 3_600_000).toISOString();
    const windowEnd   = new Date(utcNow.getTime() + 13 * 3_600_000).toISOString();
    const { data: intake } = await supabase
      .from('water_intake').select('amount_ml')
      .eq('user_id', sub.user_id)
      .gte('logged_at', windowStart).lte('logged_at', windowEnd);

    const totalMl          = intake?.reduce((s: number, l: { amount_ml: number }) => s + l.amount_ml, 0) ?? 0;
    const completedGlasses = Math.floor(totalMl / profile.glass_size_ml);
    if (!force && completedGlasses > slotIdx) continue;

    const payload = JSON.stringify({
      title: '💧 Hora de tomar agua',
      body:  `Toma ${slotIdx + 1} de ${schedule.length} · ${profile.glass_size_ml} ml`,
      slot:  schedule[slotIdx],
      amountMl: profile.glass_size_ml,
      autoLog: true,
    });

    const status = await sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);
    console.log('[push] status:', status, 'user:', sub.user_id.slice(0,8), 'endpoint:', sub.endpoint.slice(-50), 'tz:', sub.timezone);

    if (status === 410 || status === 404) {
      console.log('[push] deleting stale subscription:', sub.id);
      await supabase.from('push_subscriptions').delete().eq('id', sub.id);
    } else if (status < 300) {
      sent++;
    }
  }

  return new Response(JSON.stringify({ sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
