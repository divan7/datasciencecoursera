import { useState } from 'react';

function prefKey(userId: string | null) {
  return `aquavital-autolog-${userId ?? 'local'}`;
}

export function useAutoLogPref(userId: string | null) {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(prefKey(userId)) === 'true';
  });

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(prefKey(userId), String(next));
  }

  return { enabled, toggle };
}
