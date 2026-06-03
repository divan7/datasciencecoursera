import { useState, useEffect, useCallback } from 'react';
import { buildSchedule, getScheduleStatus, dailyGlasses, timeToMinutes } from '../utils/formula';
import type { UserProfile } from '../types';

const isNotifSupported = typeof Notification !== 'undefined';

export function useReminder(profile: UserProfile | null, totalMl: number, effectiveGoalMl: number) {
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

  const completedGlasses = profile ? Math.floor(totalMl / profile.glass_size_ml) : 0;
  const totalGlasses = profile ? dailyGlasses(effectiveGoalMl, profile.glass_size_ml) : 0;
  const status = getScheduleStatus(schedule, completedGlasses);

  // Glasses whose scheduled time has passed but haven't been consumed yet
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const scheduledBeforeNow = schedule.filter((t) => timeToMinutes(t) <= nowMin).length;
  const overdueGlasses = Math.max(0, scheduledBeforeNow - completedGlasses);

  // Time slot of the first overdue glass (for pre-filling "log past drink")
  const firstOverdueTime: string | null =
    overdueGlasses > 0 ? (schedule[completedGlasses] ?? null) : null;

  // Schedule browser notifications for ALL remaining glasses today
  useEffect(() => {
    if (notifPermission !== 'granted' || !profile) return;

    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const timers: ReturnType<typeof setTimeout>[] = [];

    schedule.forEach((time, index) => {
      if (index < completedGlasses) return;
      const [h, m] = time.split(':').map(Number);
      const msUntil = (h * 60 + m - nowMin) * 60_000;
      if (msUntil <= 0) return;

      timers.push(setTimeout(() => {
        new Notification('💧 Hora de tomar agua — AquaVital', {
          body: `Toma ${index + 1} de ${schedule.length} · ${profile.glass_size_ml} ml`,
          icon: '/icons/icon-192.png',
          tag: `water-reminder-${time}`,
        });
      }, msUntil));
    });

    return () => timers.forEach(clearTimeout);
  }, [notifPermission, profile, schedule, completedGlasses]);

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
    countdown: status.isDone
      ? '¡Meta cumplida!'
      : status.isOverdue
        ? `¡${formatCountdown(status.minutesUntil)} de retraso!`
        : formatCountdown(status.minutesUntil),
    isOverdue: status.isOverdue,
    isDone: status.isDone,
    overdueGlasses,
    firstOverdueTime,
    notifPermission,
    requestPermission,
  };
}
