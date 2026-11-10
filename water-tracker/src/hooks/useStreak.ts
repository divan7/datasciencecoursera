import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  addDays,
  applyCompletion,
  applyLoss,
  applySaver,
  saversRemaining,
  streakStatus,
  type StreakData,
} from '../utils/streakRules';

export interface PendingDay {
  date: string;
  totalMl: number;
  goalMl: number;
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

function persistStreak(userId: string | null, updated: StreakData) {
  localStorage.setItem(streakKey(userId), JSON.stringify(updated));
  if (!userId || !isSupabaseConfigured || !supabase) return;
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

// Total del día indicado: el mayor entre lo guardado en el dispositivo y Supabase,
// para no perjudicar al usuario si alguno de los dos quedó incompleto.
async function fetchDayTotal(userId: string | null, date: string): Promise<number> {
  const [y, m, d] = date.split('-').map(Number);
  let local = 0;
  try {
    const stored = localStorage.getItem(`aquavital-intake-${y}-${m}-${d}`);
    if (stored) {
      local = (JSON.parse(stored) as { amount_ml: number }[]).reduce((s, l) => s + l.amount_ml, 0);
    }
  } catch { /* ignore */ }

  if (!userId || !isSupabaseConfigured || !supabase) return local;

  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  const { data, error } = await supabase
    .from('water_intake')
    .select('amount_ml')
    .eq('user_id', userId)
    .gte('logged_at', start.toISOString())
    .lte('logged_at', end.toISOString());
  if (error || !data) return local;
  const remote = (data as { amount_ml: number }[]).reduce((s, l) => s + l.amount_ml, 0);
  return Math.max(local, remote);
}

export function useStreak(totalMl: number, goalMl: number, userId: string | null) {
  const [data, setData] = useState<StreakData>(emptyStreak);
  const [streakLoaded, setStreakLoaded] = useState(false);
  const [pending, setPending] = useState<PendingDay | null>(null);

  const loadedForRef = useRef<string | null | undefined>(undefined);
  const checkedForRef = useRef<string | null>(null);
  const dataRef = useRef(data);
  const prevTotalMlRef = useRef(totalMl);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    if (loadedForRef.current === userId) return;
    loadedForRef.current = userId;
    setStreakLoaded(false);
    setPending(null);
    checkedForRef.current = null;

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

  // Ayer quedó sin completar y la racha sigue viva hasta el fin de hoy:
  // se calcula cuánto faltó para que el usuario decida (confirmar, salvavidas o perder).
  useEffect(() => {
    if (!streakLoaded || goalMl <= 0) return;
    if (streakStatus(dataRef.current.lastCompletedDate, today) !== 'at-risk') return;

    const missed = addDays(today, -1);
    const checkKey = `${userId}|${missed}`;
    if (checkedForRef.current === checkKey) return;
    checkedForRef.current = checkKey;

    fetchDayTotal(userId, missed).then((total) => {
      const current = dataRef.current;
      if (streakStatus(current.lastCompletedDate, today) !== 'at-risk') return;
      if (total >= goalMl) {
        // Ayer sí llegó a la meta pero no quedó registrado en la racha.
        const updated = applyCompletion(current, missed);
        setData(updated);
        persistStreak(userId, updated);
        return;
      }
      setPending({ date: missed, totalMl: total, goalMl });
    });
  }, [streakLoaded, goalMl, today, userId, data.lastCompletedDate]);

  useEffect(() => {
    // Don't update prevTotalMlRef until streak is loaded.
    // If intake arrives before streak (race), leaving prev=0 ensures
    // the crossing is correctly detected when streakLoaded fires.
    if (!streakLoaded) return;

    const d = dataRef.current;
    // Hoy no cuenta hasta resolver ayer; al resolverlo cambia lastCompletedDate
    // y este efecto vuelve a correr con el cruce de meta aún sin consumir.
    if (streakStatus(d.lastCompletedDate, today) === 'at-risk') return;

    const prev = prevTotalMlRef.current;
    prevTotalMlRef.current = totalMl;

    if (goalMl <= 0 || totalMl < goalMl) return;
    if (d.lastCompletedDate === today) return;
    if (prev >= goalMl) return;

    const updated = applyCompletion(d, today);
    setData(updated);
    persistStreak(userId, updated);
  }, [totalMl, goalMl, today, userId, streakLoaded, data.lastCompletedDate]);

  function resolve(updated: StreakData) {
    setData(updated);
    persistStreak(userId, updated);
    setPending(null);
  }

  function confirmForgot() {
    if (!pending) return;
    resolve(applyCompletion(dataRef.current, pending.date));
  }

  function spendSaver() {
    if (!pending) return;
    resolve(applySaver(dataRef.current, pending.date, today));
  }

  function acceptLoss() {
    if (!pending) return;
    resolve(applyLoss(dataRef.current));
  }

  const status = streakStatus(data.lastCompletedDate, today);
  const streakBroken = status === 'broken';
  const atRisk = status === 'at-risk';

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
    atRisk,
    pending,
    saversRemaining: saversRemaining(data, today),
    confirmForgot,
    spendSaver,
    acceptLoss,
    nextMilestone,
    milestoneProgress,
    level: levelLabel(currentStreak),
  };
}
