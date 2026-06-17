// Supabase Edge Function — runs every minute via pg_cron
// Sends Web Push notifications to users whose scheduled slot matches now
import { createClient } from 'npm:@supabase/supabase-js@2';

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

// ── VAPID / Web Push (manual implementation using Web Crypto) ─────────────────

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ivan.porraz@gmail.com';

function base64urlToUint8(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), c => c.charCodeAt(0));
}

function uint8ToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importVapidPrivateKey(): Promise<CryptoKey> {
  // VAPID private key is raw 32-byte EC private key (d value), base64url encoded
  // We need to reconstruct the full EC key from public + private
  const privBytes = base64urlToUint8(VAPID_PRIVATE_KEY);
  const pubBytes  = base64urlToUint8(VAPID_PUBLIC_KEY); // 65 bytes uncompressed

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: uint8ToBase64url(pubBytes.slice(1, 33)),
    y: uint8ToBase64url(pubBytes.slice(33, 65)),
    d: uint8ToBase64url(privBytes),
  };

  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function buildVapidJwt(audience: string): Promise<string> {
  const header  = uint8ToBase64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = uint8ToBase64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })));

  const sigInput = `${header}.${payload}`;
  const privKey  = await importVapidPrivateKey();
  const sig      = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(sigInput),
  );

  // Convert DER (what subtle.sign returns) to raw r||s for JWT
  const der = new Uint8Array(sig);
  const r   = der.slice(4, 4 + der[3]);
  const s   = der.slice(6 + der[3]);
  const pad = (b: Uint8Array) => b.length < 32 ? new Uint8Array([...new Uint8Array(32 - b.length), ...b]) : b.slice(-32);
  const rawSig = new Uint8Array([...pad(r), ...pad(s)]);

  return `${sigInput}.${uint8ToBase64url(rawSig)}`;
}

// ── Push message encryption (RFC 8291 / RFC 8188) ───────────────────────────

async function encryptPayload(
  payload: string,
  clientPublicKeyB64: string,
  clientAuthB64: string,
): Promise<{ body: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(payload);

  // Generate server EC key pair for this message
  const serverKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKP.publicKey));

  // Import client public key
  const clientPubKey = await crypto.subtle.importKey(
    'raw', base64urlToUint8(clientPublicKeyB64),
    { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );

  // ECDH: derive shared secret
  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubKey },
    serverKP.privateKey, 256,
  ));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const clientAuth = base64urlToUint8(clientAuthB64);

  // HKDF auth secret → PRK
  const authInfo    = encoder.encode('WebPush: info\x00');
  const authContext = new Uint8Array([...authInfo, ...base64urlToUint8(clientPublicKeyB64), ...serverPublicKeyRaw]);
  const ikm  = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits']);
  const prk  = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: clientAuth, info: authContext }, ikm, 256,
  ));

  // HKDF content encryption key + nonce
  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits']);
  const cekInfo   = encoder.encode('Content-Encoding: aes128gcm\x00');
  const nonceInfo = encoder.encode('Content-Encoding: nonce\x00');

  const cek   = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo   }, prkKey, 128));
  const nonce = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96));

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM', length: 128 }, false, ['encrypt']);

  // Pad + encrypt
  const padded = new Uint8Array([...plaintext, 0x02]); // delimiter byte
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  // Build aes128gcm content-encoding header: salt(16) + rs(4) + keyid_len(1) + keyid + ciphertext
  const rs = 4096;
  const header = new Uint8Array(21 + serverPublicKeyRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = serverPublicKeyRaw.length;
  header.set(serverPublicKeyRaw, 21);

  const body = new Uint8Array([...header, ...encrypted]);
  return { body, salt, serverPublicKey: serverPublicKeyRaw };
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<number> {
  const url      = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt      = await buildVapidJwt(audience);
  const authHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  const { body } = await encryptPayload(payload, sub.p256dh, sub.auth);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body,
  });
  return res.status;
}

// ── Main handler ──────────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async () => {
  const utcNow = new Date();

  // Load all subscriptions with their user's profile
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*, water_profiles(*)');

  if (error || !subs?.length) {
    return new Response(JSON.stringify({ sent: 0, error: error?.message }), { status: 200 });
  }

  let sent = 0;

  for (const sub of subs) {
    const profile = sub.water_profiles as {
      glass_size_ml: number;
      daily_goal_ml: number;
      plan_current_goal_ml: number | null;
      wake_time: string;
      sleep_time: string;
    } | null;
    if (!profile) continue;

    // Convert UTC now to user's local time
    let localTime: Date;
    try {
      localTime = new Date(utcNow.toLocaleString('en-US', { timeZone: sub.timezone }));
    } catch {
      localTime = utcNow;
    }
    const localMin = localTime.getHours() * 60 + localTime.getMinutes();

    // Use current week's goal if available, else final goal
    const goalMl   = profile.plan_current_goal_ml ?? profile.daily_goal_ml;
    const schedule = buildSchedule(goalMl, profile.glass_size_ml, profile.wake_time, profile.sleep_time);

    // Find slot that matches current local minute (exact minute)
    const slotIdx = schedule.findIndex(t => timeToMinutes(t) === localMin);
    if (slotIdx === -1) continue;

    // Check today's intake in the user's local timezone (use a 26h window to be safe)
    const windowStart = new Date(utcNow.getTime() - 13 * 3_600_000).toISOString();
    const windowEnd   = new Date(utcNow.getTime() + 13 * 3_600_000).toISOString();

    const { data: intake } = await supabase
      .from('water_intake')
      .select('amount_ml')
      .eq('user_id', sub.user_id)
      .gte('logged_at', windowStart)
      .lte('logged_at', windowEnd);

    const totalMl          = intake?.reduce((s: number, l: { amount_ml: number }) => s + l.amount_ml, 0) ?? 0;
    const completedGlasses = Math.floor(totalMl / profile.glass_size_ml);

    // Only notify if user hasn't yet logged enough water to cover this slot
    if (completedGlasses > slotIdx) continue;

    const payload = JSON.stringify({
      title: '💧 Hora de tomar agua',
      body:  `Toma ${slotIdx + 1} de ${schedule.length} · ${profile.glass_size_ml} ml`,
      slot:  schedule[slotIdx],
      amountMl: profile.glass_size_ml,
      autoLog: true,
    });

    const status = await sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);

    if (status === 410 || status === 404) {
      // Subscription expired — clean it up
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
