export const MAX_SAVERS_PER_MONTH = 3;
export const GRACE_SHORTFALL = 0.2;

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  saversUsed?: { month: string; count: number };
}

export type StreakStatus = 'none' | 'active' | 'at-risk' | 'broken';

function parse(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function format(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, n: number) {
  const d = parse(date);
  d.setDate(d.getDate() + n);
  return format(d);
}

export function daysBetween(from: string, to: string) {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

// 'at-risk': el último día completado fue anteayer, es decir, ayer quedó sin
// resolver y el usuario todavía puede confirmarlo o usar un salvavidas hoy.
export function streakStatus(lastCompletedDate: string | null, today: string): StreakStatus {
  if (!lastCompletedDate) return 'none';
  const gap = daysBetween(lastCompletedDate, today);
  if (gap <= 1) return 'active';
  if (gap === 2) return 'at-risk';
  return 'broken';
}

export function saversRemaining(data: StreakData, today: string) {
  const month = today.slice(0, 7);
  const used = data.saversUsed?.month === month ? data.saversUsed.count : 0;
  return Math.max(0, MAX_SAVERS_PER_MONTH - used);
}

export function isWithinGrace(totalMl: number, goalMl: number) {
  return goalMl > 0 && (goalMl - totalMl) / goalMl < GRACE_SHORTFALL;
}

export function applyCompletion(d: StreakData, date: string): StreakData {
  const consecutive = d.lastCompletedDate !== null && daysBetween(d.lastCompletedDate, date) === 1;
  const currentStreak = consecutive ? d.currentStreak + 1 : 1;
  return {
    ...d,
    currentStreak,
    longestStreak: Math.max(currentStreak, d.longestStreak),
    lastCompletedDate: date,
  };
}

// El salvavidas cubre el día perdido sin sumarlo a la racha.
export function applySaver(d: StreakData, missedDate: string, today: string): StreakData {
  if (saversRemaining(d, today) <= 0) return d;
  const month = today.slice(0, 7);
  const used = d.saversUsed?.month === month ? d.saversUsed.count : 0;
  return { ...d, lastCompletedDate: missedDate, saversUsed: { month, count: used + 1 } };
}

export function applyLoss(d: StreakData): StreakData {
  return { ...d, currentStreak: 0, lastCompletedDate: null };
}
