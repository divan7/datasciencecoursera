import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface JournalEntry {
  week_number: number;
  entry_type: 'expectation' | 'weekly_reflection';
  content: string;
  created_at: string;
}

function storageKey(userId: string | null) {
  return `aquavital-journal-${userId ?? 'local'}`;
}

function dismissKey(userId: string | null) {
  return `aquavital-journal-seen-${userId ?? 'local'}`;
}

export function useJournal(userId: string | null) {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as JournalEntry[]; }
    catch { return []; }
  });

  const [seen, setSeen] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(dismissKey(userId)) ?? '[]') as string[]; }
    catch { return []; }
  });

  // Re-read when user changes
  useEffect(() => {
    try {
      setEntries(JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as JournalEntry[]);
      setSeen(JSON.parse(localStorage.getItem(dismissKey(userId)) ?? '[]') as string[]);
    } catch {
      setEntries([]); setSeen([]);
    }
  }, [userId]);

  // Sync from Supabase
  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase) return;
    supabase
      .from('water_journal')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped = data.map((r) => ({
            week_number: r.week_number as number,
            entry_type:  r.entry_type  as 'expectation' | 'weekly_reflection',
            content:     r.content     as string,
            created_at:  r.created_at  as string,
          }));
          setEntries(mapped);
          localStorage.setItem(storageKey(userId), JSON.stringify(mapped));
        }
      });
  }, [userId]);

  async function addEntry(
    weekNumber: number,
    type: 'expectation' | 'weekly_reflection',
    content: string,
  ) {
    const entry: JournalEntry = {
      week_number: weekNumber,
      entry_type:  type,
      content:     content.trim(),
      created_at:  new Date().toISOString(),
    };
    const updated = [...entries, entry];
    setEntries(updated);
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
    markSeen(type === 'expectation' ? 'expectation' : `week-${weekNumber}`);

    if (userId && isSupabaseConfigured && supabase) {
      await supabase.from('water_journal').insert({ ...entry, user_id: userId });
    }
  }

  function markSeen(key: string) {
    if (seen.includes(key)) return;
    const updated = [...seen, key];
    setSeen(updated);
    localStorage.setItem(dismissKey(userId), JSON.stringify(updated));
  }

  const hasSeenExpectation = entries.some((e) => e.entry_type === 'expectation')
    || seen.includes('expectation');

  function hasSeenWeekPrompt(weekNumber: number) {
    return entries.some((e) => e.entry_type === 'weekly_reflection' && e.week_number === weekNumber)
      || seen.includes(`week-${weekNumber}`);
  }

  return {
    entries,
    addEntry,
    markSeen,
    hasSeenExpectation,
    hasSeenWeekPrompt,
  };
}
