import { useState, useEffect } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { buildHydrationPlan, type PlanWeek } from '../data/plan';
import type { UserProfile } from '../types';

interface StoredPlan {
  startDate: string; // "YYYY-MM-DD"
  initialGlasses: number;
  finalGoalMl: number;
  glassSizeMl: number;
}

function planKey(userId: string | null) {
  return `aquavital-plan-${userId ?? 'local'}`;
}

export function usePlan(profile: UserProfile | null, userId: string | null) {
  const [stored, setStored] = useState<StoredPlan | null>(() => {
    try { return JSON.parse(localStorage.getItem(planKey(userId)) ?? 'null'); }
    catch { return null; }
  });

  // Track which userId has been loaded so we can gate the UI
  const [readyForUserId, setReadyForUserId] = useState<string | null | '__pending__'>('__pending__');

  useEffect(() => {
    try {
      let data = JSON.parse(localStorage.getItem(planKey(userId)) ?? 'null') as StoredPlan | null;

      // Migrate plan saved under the anonymous key to the user-specific key
      if (!data && userId) {
        const anon = JSON.parse(localStorage.getItem(planKey(null)) ?? 'null') as StoredPlan | null;
        if (anon) {
          data = anon;
          localStorage.setItem(planKey(userId), JSON.stringify(anon));
        }
      }

      setStored(data);
    } catch {
      setStored(null);
    }
    setReadyForUserId(userId);
  }, [userId]);

  // True only after the userId-specific localStorage read has completed
  const planReady = readyForUserId !== '__pending__' && readyForUserId === userId;

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
    localStorage.setItem(planKey(userId), JSON.stringify(data));
  }

  function resetPlan() {
    setStored(null);
    localStorage.removeItem(planKey(userId));
  }

  return {
    hasPlan: stored !== null,
    planReady,
    weeks,
    totalWeeks: weeks.length,
    currentWeekNumber: weekIndex + 1,
    currentWeek,
    nextWeek,
    currentGoalMl,
    isOnFinalGoal: weekIndex >= weeks.length - 1,
    daysIntoWeek: daysSinceStart % 7,
    planStartDate: stored?.startDate ?? null,
    planInitialGlasses: stored?.initialGlasses ?? 0,
    startPlan,
    resetPlan,
  };
}
