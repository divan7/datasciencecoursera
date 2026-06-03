import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { IntakeLog } from '../types';

function todayKey() {
  const d = new Date();
  return `aquavital-intake-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function useIntake(userId: string | null) {
  const [logs, setLogs] = useState<IntakeLog[]>(() => {
    try {
      const stored = localStorage.getItem(todayKey());
      return stored ? (JSON.parse(stored) as IntakeLog[]) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((next: IntakeLog[]) => {
    setLogs(next);
    localStorage.setItem(todayKey(), JSON.stringify(next));
  }, []);

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
  }, [userId, persist]);

  async function addIntake(amountMl: number) {
    const entry: IntakeLog = {
      id: crypto.randomUUID(),
      user_id: userId ?? 'local',
      amount_ml: amountMl,
      logged_at: new Date().toISOString(),
    };
    const next = [...logs, entry];
    persist(next);

    if (userId && isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('water_intake')
        .insert({ user_id: userId, amount_ml: amountMl, logged_at: entry.logged_at })
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
