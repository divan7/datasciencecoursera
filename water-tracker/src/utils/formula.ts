import type { ActivityLevel } from '../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.0,
  light:     1.1,
  moderate:  1.2,
  active:    1.3,
};

/** Frank Suarez formula: weight(kg) / 7 = glasses of 250ml/day */
export function calculateDailyGoalMl(weightKg: number, activity: ActivityLevel): number {
  const baseGlasses = weightKg / 7;
  const adjustedGlasses = Math.round(baseGlasses * ACTIVITY_MULTIPLIERS[activity]);
  return adjustedGlasses * 250;
}

/** Returns the number of glasses needed for the daily goal */
export function dailyGlasses(dailyGoalMl: number, glassSizeMl: number): number {
  return Math.ceil(dailyGoalMl / glassSizeMl);
}

/** Builds an array of "HH:MM" times distributed across the waking day */
export function buildSchedule(
  dailyGoalMl: number,
  glassSizeMl: number,
  wakeTime: string,
  sleepTime: string,
): string[] {
  const glasses = dailyGlasses(dailyGoalMl, glassSizeMl);
  const wakeMin  = timeToMinutes(wakeTime);
  const sleepMin = timeToMinutes(sleepTime);
  const available = sleepMin - wakeMin - 60; // leave 1 h before bed

  const interval = glasses > 1 ? Math.floor(available / (glasses - 1)) : available;

  return Array.from({ length: glasses }, (_, i) =>
    minutesToTime(wakeMin + i * interval),
  );
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getScheduleStatus(
  schedule: string[],
  completedGlasses: number,
  now: Date = new Date(),
): { nextTime: string | null; minutesUntil: number; isOverdue: boolean; isDone: boolean } {
  if (completedGlasses >= schedule.length) {
    return { nextTime: null, minutesUntil: 0, isOverdue: false, isDone: true };
  }

  const nextTime = schedule[completedGlasses];
  const nextMin  = timeToMinutes(nextTime);
  const nowMin   = now.getHours() * 60 + now.getMinutes();
  const diff     = nextMin - nowMin;

  return {
    nextTime,
    minutesUntil: Math.abs(diff),
    isOverdue: diff < 0,
    isDone: false,
  };
}
