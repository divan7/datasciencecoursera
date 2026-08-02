import { useState, useEffect, useRef } from 'react';
import { isYesterday, parseISO } from 'date-fns';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null; // "YYYY-MM-DD"
}

function streakKey(userId: string | null) {
  return `aquavital-streak-${userId ?? 'local'}`;
}

const LEGACY_KEY = 'aquavital-streak';

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyStreak(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
}

export function useStreak(totalMl: number, goalMl: number, userId: string | null) {
  const [data, setData] = useState<StreakData>(emptyStreak);
  const [streakLoaded, setStreakLoaded] = useState(false);

  const loadedForRef = useRef<string | null | undefined>(undefined);
  const dataRef = useRef(data);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    if (loadedForRef.current === userId) return;
    loadedForRef.current = userId;
    setStreakLoaded(false);

    const key = streakKey(userId);

    const scoped = localStorage.getItem(key);
    if (scoped) {
      try { setData(JSON.parse(scoped) as StreakData); } catch { /* ignore */ }
      setStreakLoaded(true);
      return;
    }

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy) as StreakData;
        localStorage.setItem(key, legacy);
        setData(parsed);
      } catch { /* ignore */ }
      setStreakLoaded(true);
      return;
    }

    if (!userId || !isSupabaseConfigured || !supabase) {
      setStreakLoaded(true);
      return;
    }

    supabase
      .from('water_profiles')
      .select('streak_data')
      .eq('id', userId)
      .single()
      .then(({ data: profile }) => {
        const remote = (profile as { streak_data?: StreakData } | null)?.streak_data;
        if (remote) {
          setData(remote);
          localStorage.setItem(key, JSON.stringify(remote));
        }
        setStreakLoaded(true);
      });
  }, [userId]);

  const today = todayDate();

  useEffect(() => {
    if (!streakLoaded) return;
    if (goalMl <= 0 || totalMl < goalMl) return;
    const d = dataRef.current;
    if (d.lastCompletedDate === today) return;

    const isConsecutive =
      d.lastCompletedDate !== null &&
      isYesterday(parseISO(d.lastCompletedDate));

    const newStreak = isConsecutive ? d.currentStreak + 1 : 1;
    const updated: StreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, d.longestStreak),
      lastCompletedDate: today,
    };
    setData(updated);
    const key = streakKey(userId);
    localStorage.setItem(key, JSON.stringify(updated));

    if (userId && isSupabaseConfigured && supabase) {
      supabase
        .from('water_profiles')
        .update({ streak_data: updated })
        .eq('id', userId)
        .then(() => { /* fire-and-forget */ });
    }
  }, [totalMl, goalMl, today, userId, streakLoaded]);

  const streakBroken =
    data.lastCompletedDate !== null &&
    data.lastCompletedDate !== today &&
    !isYesterday(parseISO(data.lastCompletedDate));

  const currentStreak = streakBroken ? 0 : data.currentStreak;
  const todayCompleted = data.lastCompletedDate === today;

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
