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

export function buildGoogleCalendarUrl(tpl: FixedExpenseTemplate): string {
  const dueDate = getNextDueDate(tpl);
  if (!dueDate) return '';

  const dateStr = format(dueDate, 'yyyyMMdd');
  const endStr = format(addDays(dueDate, 1), 'yyyyMMdd');

  const rruleMap: Record<string, string> = {
    diario: 'RRULE:FREQ=DAILY',
    semanal: 'RRULE:FREQ=WEEKLY',
    quincenal: '',
    mensual: 'RRULE:FREQ=MONTHLY',
    bimestral: 'RRULE:FREQ=MONTHLY;INTERVAL=2',
    trimestral: 'RRULE:FREQ=MONTHLY;INTERVAL=3',
    semestral: 'RRULE:FREQ=MONTHLY;INTERVAL=6',
    anual: 'RRULE:FREQ=YEARLY',
  };

  const recur = rruleMap[tpl.frequency] ?? '';
  const params: Record<string, string> = {
    text: `Pago: ${tpl.concept}`,
    dates: `${dateStr}/${endStr}`,
    details: `Monto esperado: $${tpl.expectedAmount.toLocaleString('es-MX')}\nPagado por: ${tpl.paidBy}`,
  };
  if (recur) params.recur = recur;

  return `https://calendar.google.com/calendar/r/eventedit?${new URLSearchParams(params).toString()}`;
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
