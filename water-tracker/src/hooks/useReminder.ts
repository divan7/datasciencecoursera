import { useState, useEffect, useCallback } from 'react';
import { buildSchedule, getScheduleStatus, dailyGlasses, timeToMinutes } from '../utils/formula';
import type { UserProfile } from '../types';

const isNotifSupported = typeof Notification !== 'undefined';

export function useReminder(
  profile: UserProfile | null,
  totalMl: number,
  effectiveGoalMl: number,
  disabledTimes: string[] = [],
  autoLogEnabled = false,
) {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    isNotifSupported ? Notification.permission : 'denied',
  );
  const [, tick] = useState(0);

  // Re-compute every minute
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const schedule = profile
    ? buildSchedule(effectiveGoalMl, profile.glass_size_ml, profile.wake_time, profile.sleep_time)
    : [];

  // Active slots = schedule minus times the user has disabled
  const activeSchedule = schedule.filter((t) => !disabledTimes.includes(t));

  const completedGlasses = profile ? Math.floor(totalMl / profile.glass_size_ml) : 0;
  const totalGlasses = profile ? dailyGlasses(effectiveGoalMl, profile.glass_size_ml) : 0;

  // isDone = actual goal reached, independent of how many slots are active
  const isDone = completedGlasses >= totalGlasses;

  // nextTime / overdue based on active (enabled) slots only; isDone overrides
  const status = getScheduleStatus(activeSchedule, isDone ? activeSchedule.length : completedGlasses);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const activeBeforeNow = activeSchedule.filter((t) => timeToMinutes(t) <= nowMin).length;
  const overdueGlasses = isDone ? 0 : Math.max(0, activeBeforeNow - completedGlasses);

  const firstOverdueTime: string | null =
    overdueGlasses > 0 ? (activeSchedule[completedGlasses] ?? null) : null;

  // Schedule browser notifications only for enabled slots
  useEffect(() => {
    if (notifPermission !== 'granted' || !profile) return;

    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const timers: ReturnType<typeof setTimeout>[] = [];

    activeSchedule.forEach((time, index) => {
      if (index < completedGlasses) return;
      const [h, m] = time.split(':').map(Number);
      const msUntil = (h * 60 + m - nowMin) * 60_000;
      if (msUntil <= 0) return;

      timers.push(setTimeout(async () => {
        const title = '💧 Hora de tomar agua — AquaVital';
        const body = `Toma ${index + 1} de ${activeSchedule.length} · ${profile.glass_size_ml} ml`;
        const tag = `water-reminder-${time}`;

        // Use SW notification (supports action buttons + tap-to-log) when available
        const sw = navigator.serviceWorker?.controller
          ? await navigator.serviceWorker.ready.catch(() => null)
          : null;

        if (sw && autoLogEnabled) {
          sw.showNotification(title, {
            body,
            icon: '/icons/icon-192.png',
            tag,
            data: { amountMl: profile.glass_size_ml, slot: time, autoLog: true },
            actions: [
              { action: 'log',     title: '✅ Ya tomé' },
              { action: 'dismiss', title: 'Después' },
            ],
          } as NotificationOptions);
        } else if (sw) {
          sw.showNotification(title, { body, icon: '/icons/icon-192.png', tag });
        } else {
          new Notification(title, { body, icon: '/icons/icon-192.png', tag });
        }
      }, msUntil));
    });

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifPermission, profile, disabledTimes, completedGlasses, autoLogEnabled]);

  const requestPermission = useCallback(async () => {
    if (!isNotifSupported) return 'denied' as NotificationPermission;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    return perm;
  }, []);

  function formatCountdown(minutes: number): string {
    if (minutes === 0) return '¡Ahora!';
    if (minutes < 60) return `en ${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `en ${h}h${m > 0 ? ` ${m}min` : ''}`;
  }

  return {
    schedule,
    completedGlasses,
    totalGlasses,
    nextTime: status.nextTime,
    countdown: isDone
      ? '¡Meta cumplida!'
      : status.isOverdue
        ? `¡${formatCountdown(status.minutesUntil)} de retraso!`
        : formatCountdown(status.minutesUntil),
    isOverdue: !isDone && status.isOverdue,
    isDone,
    overdueGlasses,
    firstOverdueTime,
    notifPermission,
    requestPermission,
  };
}
