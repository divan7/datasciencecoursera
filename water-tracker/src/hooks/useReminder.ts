import { useState, useEffect, useCallback } from 'react';
import { buildSchedule, getScheduleStatus, dailyGlasses } from '../utils/formula';
import type { UserProfile } from '../types';

const isNotifSupported = typeof Notification !== 'undefined';

export function useReminder(profile: UserProfile | null, totalMl: number) {
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
    ? buildSchedule(profile.daily_goal_ml, profile.glass_size_ml, profile.wake_time, profile.sleep_time)
    : [];

  const completedGlasses = profile ? Math.floor(totalMl / profile.glass_size_ml) : 0;
  const totalGlasses = profile ? dailyGlasses(profile.daily_goal_ml, profile.glass_size_ml) : 0;
  const status = getScheduleStatus(schedule, completedGlasses);

  // Schedule browser notification for next glass
  useEffect(() => {
    if (!status.nextTime || notifPermission !== 'granted' || status.isOverdue) return;
    const msUntil = status.minutesUntil * 60_000;
    if (msUntil <= 0) return;

    const timer = setTimeout(() => {
      new Notification('💧 Hora de tomar agua — AquaVital', {
        body: `Toma tu vaso de ${profile?.glass_size_ml ?? 250} ml ahora`,
        icon: '/icons/icon-192.png',
        tag: 'water-reminder',
      });
    }, msUntil);

    return () => clearTimeout(timer);
  }, [status.nextTime, status.minutesUntil, status.isOverdue, notifPermission, profile]);

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
    notifPermission,
    requestPermission,
  };
}
