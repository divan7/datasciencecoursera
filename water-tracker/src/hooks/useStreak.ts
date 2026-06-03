import { useState, useEffect } from 'react';
import { isYesterday, parseISO } from 'date-fns';

const STREAK_KEY = 'aquavital-streak';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null; // "YYYY-MM-DD"
}

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useStreak(totalMl: number, goalMl: number) {
  const [data, setData] = useState<StreakData>(() => {
    try {
      return JSON.parse(localStorage.getItem(STREAK_KEY) ?? 'null') ??
        { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
    } catch {
      return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
    }
  });

  const today = todayDate();

  useEffect(() => {
    if (goalMl <= 0 || totalMl < goalMl) return;
    if (data.lastCompletedDate === today) return; // already counted today

    const isConsecutive =
      data.lastCompletedDate !== null &&
      isYesterday(parseISO(data.lastCompletedDate));

    const newStreak = isConsecutive ? data.currentStreak + 1 : 1;
    const updated: StreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, data.longestStreak),
      lastCompletedDate: today,
    };
    setData(updated);
    localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  }, [totalMl, goalMl, today, data]);

  // If the last completed day was before yesterday, streak is broken for display
  const streakBroken =
    data.lastCompletedDate !== null &&
    data.lastCompletedDate !== today &&
    !isYesterday(parseISO(data.lastCompletedDate));

  const currentStreak = streakBroken ? 0 : data.currentStreak;
  const todayCompleted = data.lastCompletedDate === today;

  // Next milestone
  const MILESTONES = [3, 21, 66];
  const nextMilestone = MILESTONES.find((m) => m > currentStreak) ?? 66;
  const prevMilestone = MILESTONES.filter((m) => m <= currentStreak).at(-1) ?? 0;
  const milestoneProgress =
    nextMilestone === prevMilestone
      ? 100
      : ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  function levelLabel(days: number): { label: string; emoji: string } {
    if (days >= 66) return { label: '¡Hábito formado!', emoji: '🏆' };
    if (days >= 21) return { label: 'Hábito en formación', emoji: '🌳' };
    if (days >= 7)  return { label: 'Construyendo el hábito', emoji: '🌿' };
    if (days >= 3)  return { label: 'Mecanismo activado', emoji: '🌱' };
    return { label: 'Iniciando el hábito', emoji: '💧' };
  }

  return {
    currentStreak,
    longestStreak: data.longestStreak,
    todayCompleted,
    streakBroken,
    nextMilestone,
    milestoneProgress,
    level: levelLabel(currentStreak),
  };
}
