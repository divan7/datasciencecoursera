import { useState, useEffect, useRef } from 'react';

function prefKey(userId: string | null) {
  return `aquavital-autolog-${userId ?? 'local'}`;
}

export function useAutoLogPref(userId: string | null) {
  const [enabled, setEnabled] = useState(false);
  const loadedForRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loadedForRef.current === userId) return;
    loadedForRef.current = userId;
    setEnabled(localStorage.getItem(prefKey(userId)) === 'true');
  }, [userId]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(prefKey(userId), String(next));
  }

  return { enabled, toggle };
}
