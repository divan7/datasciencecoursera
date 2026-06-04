import { useState, useEffect } from 'react';

function prefKey(userId: string | null) {
  return `aquavital-notif-disabled-${userId ?? 'local'}`;
}

export function useNotificationPrefs(userId: string | null) {
  const [disabled, setDisabled] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(prefKey(userId)) ?? '[]') as string[]; }
    catch { return []; }
  });

  useEffect(() => {
    try { setDisabled(JSON.parse(localStorage.getItem(prefKey(userId)) ?? '[]') as string[]); }
    catch { setDisabled([]); }
  }, [userId]);

  function save(updated: string[]) {
    setDisabled(updated);
    localStorage.setItem(prefKey(userId), JSON.stringify(updated));
  }

  function toggleTime(time: string) {
    save(disabled.includes(time) ? disabled.filter((t) => t !== time) : [...disabled, time]);
  }

  function isEnabled(time: string) {
    return !disabled.includes(time);
  }

  function enableAll(schedule: string[]) {
    save(disabled.filter((t) => !schedule.includes(t)));
  }

  function disableAll(schedule: string[]) {
    const merged = Array.from(new Set([...disabled, ...schedule]));
    save(merged);
  }

  return { disabledTimes: disabled, toggleTime, isEnabled, enableAll, disableAll };
}
