import { addDays, format, startOfDay } from 'date-fns';
import type { FixedExpenseTemplate } from '../types/fixedExpense';

const NOTIFIED_KEY = 'orden_casa_notified';

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markNotified(key: string) {
  const set = getNotifiedSet();
  set.add(key);
  // Prune keys older than 2 months to avoid unbounded growth
  const cutoff = format(addDays(new Date(), -60), 'yyyy-MM');
  const pruned = [...set].filter((k) => {
    const m = k.split('_').pop();
    return m ? m >= cutoff : true;
  });
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(pruned));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNextDueDate(tpl: FixedExpenseTemplate): Date | null {
  const today = startOfDay(new Date());
  const y = today.getFullYear();
  const mo = today.getMonth(); // 0-based

  switch (tpl.frequency) {
    case 'diario':
      return addDays(today, 1);

    case 'semanal': {
      if (!tpl.dayOfWeek) return null;
      const todayDow = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon,7=Sun
      const diff = ((tpl.dayOfWeek - todayDow + 7) % 7) || 7;
      return addDays(today, diff);
    }

    case 'quincenal': {
      const day = tpl.dayOfMonth ?? 1;
      const mid = day + 15;
      const cands = [
        new Date(y, mo, day),
        new Date(y, mo, mid),
        new Date(y, mo + 1, day),
      ];
      return cands.find((d) => d >= today) ?? cands[cands.length - 1];
    }

    case 'mensual': {
      const day = tpl.dayOfMonth ?? 1;
      const candidate = new Date(y, mo, day);
      return candidate >= today ? candidate : new Date(y, mo + 1, day);
    }

    case 'bimestral':
    case 'trimestral':
    case 'semestral': {
      const intervalMap: Record<string, number> = { bimestral: 2, trimestral: 3, semestral: 6 };
      const interval = intervalMap[tpl.frequency];
      const day = tpl.dayOfMonth ?? 1;
      let next = new Date(y, mo, day);
      while (next < today) {
        next = new Date(next.getFullYear(), next.getMonth() + interval, day);
      }
      return next;
    }

    case 'anual': {
      const day = tpl.dayOfMonth ?? 1;
      const month = (tpl.paymentMonth ?? 1) - 1; // to 0-based
      const candidate = new Date(y, month, day);
      return candidate >= today ? candidate : new Date(y + 1, month, day);
    }

    default:
      return null;
  }
}

/** For credit cards, the due date = cutDay + paymentDueDaysAfterCut days */
export function getCreditCardPaymentDate(tpl: FixedExpenseTemplate): Date | null {
  if (!tpl.isCreditCard || !tpl.cutDay) return null;
  const today = startOfDay(new Date());
  const dueDays = tpl.paymentDueDaysAfterCut ?? 20;
  const y = today.getFullYear();
  const mo = today.getMonth();
  const candidate = addDays(new Date(y, mo, tpl.cutDay), dueDays);
  return candidate >= today ? candidate : addDays(new Date(y, mo + 1, tpl.cutDay), dueDays);
}

/** Returns next payment due date, honouring credit card cut+pay cycle */
export function getEffectiveDueDate(tpl: FixedExpenseTemplate): Date | null {
  if (tpl.isCreditCard) return getCreditCardPaymentDate(tpl);
  return getNextDueDate(tpl);
}

// ── ICS generation ────────────────────────────────────────────────────────────

const RRULE_MAP: Record<string, string> = {
  diario:     'FREQ=DAILY',
  semanal:    'FREQ=WEEKLY',
  mensual:    'FREQ=MONTHLY',
  bimestral:  'FREQ=MONTHLY;INTERVAL=2',
  trimestral: 'FREQ=MONTHLY;INTERVAL=3',
  semestral:  'FREQ=MONTHLY;INTERVAL=6',
  anual:      'FREQ=YEARLY',
};

function icsDate(d: Date): string {
  return format(d, 'yyyyMMdd');
}

export function buildICSContent(tpl: FixedExpenseTemplate, daysBefore = 1): string {
  const dueDate = getEffectiveDueDate(tpl);
  if (!dueDate) return '';

  const dtStart = icsDate(dueDate);
  const dtEnd   = icsDate(addDays(dueDate, 1));
  const rrule   = tpl.isCreditCard ? `FREQ=MONTHLY` : RRULE_MAP[tpl.frequency] ?? '';

  const amountLine = `Monto esperado: $${tpl.expectedAmount.toLocaleString('es-MX')}`;
  const minLine    = tpl.minimumPayment ? `\\nPago mínimo: $${tpl.minimumPayment.toLocaleString('es-MX')}` : '';
  const cutLine    = tpl.isCreditCard && tpl.cutDay
    ? `\\nCorte: día ${tpl.cutDay} · Límite pago: ${tpl.paymentDueDaysAfterCut ?? 20} días después`
    : '';
  const bankLine   = tpl.bank ? `\\n${tpl.bank}${tpl.cardLast4 ? ` ···${tpl.cardLast4}` : ''}` : '';
  const description = `${amountLine}${minLine}${cutLine}${bankLine}\\nRegistrado con Orden Casa`;

  const prefix = tpl.isCreditCard ? '💳' : '📋';
  const uid    = `${tpl.id}-${Date.now()}@ordencasa.app`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orden Casa//SOIHogar//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    ...(rrule ? [`RRULE:${rrule}`] : []),
    `SUMMARY:${prefix} Pago: ${tpl.concept}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    `TRIGGER:-P${daysBefore}D`,
    'ACTION:DISPLAY',
    `DESCRIPTION:Recordatorio: ${tpl.concept} vence pronto`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

export function downloadICS(tpl: FixedExpenseTemplate, daysBefore = 1): void {
  const content = buildICSContent(tpl, daysBefore);
  if (!content) return;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${tpl.concept.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  // Append to body so the click works reliably in all browsers (including iOS Safari PWA)
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revocation so the browser has time to start the download before the URL is freed
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function buildGoogleCalendarUrl(tpl: FixedExpenseTemplate): string {
  // Fall back to tomorrow when no specific due date can be computed (e.g. semanal without dayOfWeek)
  const dueDate = getEffectiveDueDate(tpl) ?? addDays(startOfDay(new Date()), 1);

  const dateStr = format(dueDate, 'yyyyMMdd');
  const endStr  = format(addDays(dueDate, 1), 'yyyyMMdd');

  const rruleGcal: Record<string, string> = {
    diario: 'RRULE:FREQ=DAILY', semanal: 'RRULE:FREQ=WEEKLY',
    mensual: 'RRULE:FREQ=MONTHLY', bimestral: 'RRULE:FREQ=MONTHLY;INTERVAL=2',
    trimestral: 'RRULE:FREQ=MONTHLY;INTERVAL=3', semestral: 'RRULE:FREQ=MONTHLY;INTERVAL=6',
    anual: 'RRULE:FREQ=YEARLY',
  };
  const recur = tpl.isCreditCard ? 'RRULE:FREQ=MONTHLY' : (rruleGcal[tpl.frequency] ?? '');

  const details = tpl.isCreditCard && tpl.cutDay
    ? `Monto: $${tpl.expectedAmount.toLocaleString('es-MX')}\nCorte: día ${tpl.cutDay}\nLímite: ${tpl.paymentDueDaysAfterCut ?? 20} días después del corte`
    : `Monto: $${tpl.expectedAmount.toLocaleString('es-MX')}\nPagado por: ${tpl.paidBy}`;

  // Use the classic /render?action=TEMPLATE format — widely supported on desktop,
  // mobile browsers, and the Google Calendar app. The newer /r/eventedit path
  // does not reliably populate the event form on mobile devices.
  // recur must NOT be percent-encoded: Google Calendar requires raw RRULE syntax.
  const prefix = tpl.isCreditCard ? '💳' : '📋';
  const parts = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(`${prefix} Pago: ${tpl.concept}`)}`,
    `dates=${dateStr}/${endStr}`,
    `details=${encodeURIComponent(details)}`,
  ];
  if (recur) parts.push(`recur=${recur}`);
  return `https://www.google.com/calendar/render?${parts.join('&')}`;
}

export function checkAndFireNotifications(templates: FixedExpenseTemplate[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = startOfDay(new Date());
  const notified = getNotifiedSet();

  for (const tpl of templates) {
    if (!tpl.active || !tpl.reminderEnabled) continue;

    const dueDate = getNextDueDate(tpl);
    if (!dueDate) continue;

    const daysBefore = tpl.reminderDaysBefore ?? 1;
    const reminderDate = startOfDay(addDays(dueDate, -daysBefore));

    if (today >= reminderDate && today <= dueDate) {
      const key = `${tpl.id}_${format(dueDate, 'yyyy-MM-dd')}`;
      if (notified.has(key)) continue;

      const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
      const body = daysUntil === 0
        ? `Hoy vence el pago de ${tpl.concept} · $${tpl.expectedAmount.toLocaleString('es-MX')}`
        : `El pago de ${tpl.concept} vence en ${daysUntil} día${daysUntil > 1 ? 's' : ''} · $${tpl.expectedAmount.toLocaleString('es-MX')}`;

      new Notification('Orden Casa — Recordatorio', { body, tag: key });
      markNotified(key);
    }
  }
}
