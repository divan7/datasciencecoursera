import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { IntakeLog } from '../types';

function todayKey() {
  const d = new Date();
  return `aquavital-intake-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadFromStorage(key: string): IntakeLog[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as IntakeLog[]) : [];
  } catch {
    return [];
  }
}

export function useIntake(userId: string | null) {
  const [dateKey, setDateKey] = useState(todayKey);
  const [logs, setLogs] = useState<IntakeLog[]>(() => loadFromStorage(todayKey()));

  const persist = useCallback((next: IntakeLog[]) => {
    setLogs(next);
    localStorage.setItem(todayKey(), JSON.stringify(next));
  }, []);

  // Reset logs when the day changes (app left open overnight)
  useEffect(() => {
    function onVisibility() {
      const newKey = todayKey();
      if (document.visibilityState === 'visible' && newKey !== dateKey) {
        setDateKey(newKey);
        setLogs(loadFromStorage(newKey));
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [dateKey]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', start.toISOString())
      .lte('logged_at', end.toISOString())
      .order('logged_at', { ascending: true })
      .then(({ data }) => {
        if (data) persist(data as IntakeLog[]);
      });
  }, [userId, dateKey, persist]);

  async function addIntake(amountMl: number, loggedAt?: Date) {
    const timestamp = (loggedAt ?? new Date()).toISOString();
    const entry: IntakeLog = {
      id: crypto.randomUUID(),
      user_id: userId ?? 'local',
      amount_ml: amountMl,
      logged_at: timestamp,
    };
    const next = [...logs, entry].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );
    persist(next);

    if (userId && isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('water_intake')
        .insert({ user_id: userId, amount_ml: amountMl, logged_at: timestamp })
        .select()
        .single();
      if (data) {
        persist(next.map((l) => (l.id === entry.id ? (data as IntakeLog) : l)));
      }
    }
  }

  async function removeIntake(id: string) {
    persist(logs.filter((l) => l.id !== id));
    if (userId && isSupabaseConfigured && supabase) {
      await supabase.from('water_intake').delete().eq('id', id);
    }
  }

  const totalMl = logs.reduce((s, l) => s + l.amount_ml, 0);

  return { logs, totalMl, addIntake, removeIntake };
}
