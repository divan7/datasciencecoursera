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
  const prevTotalMlRef = useRef(totalMl);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    if (loadedForRef.current === userId) return;
    loadedForRef.current = userId;
    setStreakLoaded(false);

    // Reset crossing tracker on every user change so stale values don't
    // block legitimate goal completions in the new session.
    prevTotalMlRef.current = 0;

    const key = streakKey(userId);

    // Show cached data immediately for instant visual feedback
    const cached = localStorage.getItem(key) ?? localStorage.getItem(LEGACY_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as StreakData;
        setData(parsed);
        // If today is already marked, prevent spurious re-increment on async intake load
        if (parsed.lastCompletedDate === todayDate()) prevTotalMlRef.current = Infinity;
      } catch { /* ignore */ }
    }

    // Without Supabase, localStorage is the only source
    if (!userId || !isSupabaseConfigured || !supabase) {
      setStreakLoaded(true);
      return;
    }

    // Supabase is always authoritative — fetch even when localStorage had data.
    // This prevents stale/corrupt local cache from permanently overriding the server.
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
          if (remote.lastCompletedDate === todayDate()) {
            prevTotalMlRef.current = Infinity;
          }
        }
        setStreakLoaded(true);
      });
  }, [userId]);

  const today = todayDate();

  useEffect(() => {
    // Don't update prevTotalMlRef until streak is loaded.
    // If intake arrives before streak (race), leaving prev=0 ensures
    // the crossing is correctly detected when streakLoaded fires.
    if (!streakLoaded) return;

    const prev = prevTotalMlRef.current;
    prevTotalMlRef.current = totalMl;

    if (goalMl <= 0 || totalMl < goalMl) return;
    const d = dataRef.current;
    if (d.lastCompletedDate === today) return;
    if (prev >= goalMl) return;

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
        .then(({ error }) => {
          if (error) {
            setTimeout(() => {
              supabase!
                .from('water_profiles')
                .update({ streak_data: updated })
                .eq('id', userId)
                .then(() => {});
            }, 3000);
          }
        });
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
