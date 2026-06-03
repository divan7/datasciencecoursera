import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { buildHydrationPlan, type PlanWeek } from '../data/plan';
import type { UserProfile } from '../types';

const PLAN_KEY = 'aquavital-plan';

interface StoredPlan {
  startDate: string; // "YYYY-MM-DD"
  initialGlasses: number;
  finalGoalMl: number;
  glassSizeMl: number;
}

export function usePlan(profile: UserProfile | null) {
  const [stored, setStored] = useState<StoredPlan | null>(() => {
    try { return JSON.parse(localStorage.getItem(PLAN_KEY) ?? 'null'); }
    catch { return null; }
  });

  const weeks: PlanWeek[] = stored && profile
    ? buildHydrationPlan(stored.initialGlasses, stored.finalGoalMl, stored.glassSizeMl)
    : [];

  const daysSinceStart = stored
    ? differenceInDays(new Date(), parseISO(stored.startDate))
    : 0;

  const weekIndex = weeks.length > 0
    ? Math.min(Math.floor(daysSinceStart / 7), weeks.length - 1)
    : 0;

  const currentWeek: PlanWeek | null = weeks[weekIndex] ?? null;
  const nextWeek: PlanWeek | null = weeks[weekIndex + 1] ?? null;

  // Current effective daily goal
  const currentGoalMl = currentWeek?.dailyGoalMl ?? profile?.daily_goal_ml ?? 0;

  function startPlan(initialGlasses: number) {
    if (!profile) return;
    const data: StoredPlan = {
      startDate: new Date().toISOString().slice(0, 10),
      initialGlasses,
      finalGoalMl: profile.daily_goal_ml,
      glassSizeMl: profile.glass_size_ml,
    };
    setStored(data);
    localStorage.setItem(PLAN_KEY, JSON.stringify(data));
  }

  function resetPlan() {
    setStored(null);
    localStorage.removeItem(PLAN_KEY);
  }

  return {
    hasPlan: stored !== null,
    weeks,
    totalWeeks: weeks.length,
    currentWeekNumber: weekIndex + 1,
    currentWeek,
    nextWeek,
    currentGoalMl,
    isOnFinalGoal: weekIndex >= weeks.length - 1,
    daysIntoWeek: daysSinceStart % 7,
    startPlan,
    resetPlan,
  };
}
