import { useState, useEffect, useRef } from 'react';
import { Settings, LogOut, Droplets, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WaterCircle } from './WaterCircle';
import { QuickAdd } from './QuickAdd';
import { IntakeTimeline } from './IntakeTimeline';
import { ReminderCard } from './ReminderCard';
import { HabitCard } from './HabitCard';
import { DailyMessage } from './DailyMessage';
import { PlanCard } from './PlanCard';
import { useIntake } from '../hooks/useIntake';
import { useReminder } from '../hooks/useReminder';
import { useStreak } from '../hooks/useStreak';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { useAutoLogPref } from '../hooks/useAutoLogPref';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile } from '../types';
import type { usePlan } from '../hooks/usePlan';
import type { useJournal } from '../hooks/useJournal';

type PlanHook = ReturnType<typeof usePlan>;
type JournalHook = ReturnType<typeof useJournal>;

interface Props {
  profile: UserProfile;
  plan: PlanHook;
  journal: JournalHook;
  userId: string | null;
  onEditProfile: () => void;
  onLogout: () => void;
}

export function Dashboard({ profile, plan, journal, userId, onEditProfile, onLogout }: Props) {
  const [showJournal, setShowJournal] = useState(false);
  const [autoLogToast, setAutoLogToast] = useState(false);
  const { logs, totalMl, addIntake, removeIntake } = useIntake(userId);
  const notifPrefs   = useNotificationPrefs(userId);
  const autoLogPref  = useAutoLogPref(userId);

  // Use the current week's goal from the plan (not the final profile goal)
  const effectiveGoalMl = plan.currentGoalMl;

  const reminder = useReminder(profile, totalMl, effectiveGoalMl, notifPrefs.disabledTimes, autoLogPref.enabled);
  const streak   = useStreak(totalMl, effectiveGoalMl, userId);
  const pushSub  = usePushSubscription(userId, reminder.notifPermission);

  // Auto-subscribe to Web Push when notifications are granted
  useEffect(() => {
    if (reminder.notifPermission === 'granted' && !pushSub.subscribed && pushSub.isPushSupported) {
      void pushSub.subscribe();
    }
  }, [reminder.notifPermission, pushSub.subscribed, pushSub.isPushSupported, pushSub]);

  // Keep Supabase in sync with the current week's effective goal (used by Edge Function)
  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase || effectiveGoalMl <= 0) return;
    void supabase
      .from('water_profiles')
      .update({ plan_current_goal_ml: effectiveGoalMl })
      .eq('id', userId);
  }, [userId, effectiveGoalMl]);

  const pct   = effectiveGoalMl > 0 ? Math.min(100, (totalMl / effectiveGoalMl) * 100) : 0;
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  // Handle tap-to-log from SW notification (?log=250&slot=HH:MM)
  const autoLogHandled = useRef(false);
  useEffect(() => {
    if (autoLogHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const logMl = parseInt(params.get('log') ?? '0', 10);
    if (logMl <= 0) return;
    autoLogHandled.current = true;
    window.history.replaceState({}, '', '/');
    const slot = params.get('slot');
    let logTime: Date | undefined;
    if (slot) {
      logTime = new Date();
      const [h, m] = slot.split(':').map(Number);
      logTime.setHours(h, m, 0, 0);
      if (logTime > new Date()) logTime.setTime(new Date().getTime() - 60_000);
    }
    void addIntake(logMl, logTime);
    setAutoLogToast(true);
    setTimeout(() => setAutoLogToast(false), 3500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogPastDrink(amountMl: number, timeStr: string) {
    const [h, m] = timeStr.split(':').map(Number);
    const past = new Date();
    past.setHours(h, m, 0, 0);
    if (past > new Date()) past.setTime(new Date().getTime() - 60_000);
    await addIntake(amountMl, past);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex flex-col">

      {/* Auto-log confirmation toast */}
      {autoLogToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 animate-pulse">
          💧 Vaso registrado automáticamente
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-2 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Droplets size={18} className="text-sky-400" />
            <span className="text-white font-black tracking-tight text-lg">AquaVital</span>
          </div>
          <p className="text-white/30 text-xs capitalize mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEditProfile}
            className="p-2.5 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/8 transition-all"
            title="Configuración"
          >
            <Settings size={18} />
          </button>
          {userId && (
            <button
              onClick={onLogout}
              className="p-2.5 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/8 transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-4" style={{ scrollbarWidth: 'none' }}>

        {/* Daily motivational message */}
        <DailyMessage />

        {/* Water progress circle */}
        <div className="pt-1">
          <WaterCircle
            percentage={pct}
            consumedMl={totalMl}
            goalMl={effectiveGoalMl}
          />
        </div>

        {/* Reminder + deficit / catch-up */}
        <ReminderCard
          nextTime={reminder.nextTime}
          countdown={reminder.countdown}
          isOverdue={reminder.isOverdue}
          isDone={reminder.isDone}
          notifPermission={reminder.notifPermission}
          completedGlasses={reminder.completedGlasses}
          totalGlasses={reminder.totalGlasses}
          overdueGlasses={reminder.overdueGlasses}
          firstOverdueTime={reminder.firstOverdueTime}
          glassSizeMl={profile.glass_size_ml}
          schedule={reminder.schedule}
          calendarPlan={plan.planStartDate ? {
            startDate: plan.planStartDate,
            initialGlasses: plan.planInitialGlasses,
            finalGoalMl: profile.daily_goal_ml,
            glassSizeMl: profile.glass_size_ml,
            wakeTime: profile.wake_time,
            sleepTime: profile.sleep_time,
          } : null}
          onRequestPermission={reminder.requestPermission}
          onLogPastDrink={handleLogPastDrink}
          autoLogEnabled={autoLogPref.enabled}
          onToggleAutoLog={autoLogPref.toggle}
          onUnsubscribePush={pushSub.unsubscribe}
        />

        {/* Quick add */}
        <QuickAdd glassSizeMl={profile.glass_size_ml} onAdd={addIntake} />

        {/* Scheduled intake timeline */}
        <IntakeTimeline
          logs={logs}
          schedule={reminder.schedule}
          glassSizeMl={profile.glass_size_ml}
          disabledTimes={notifPrefs.disabledTimes}
          notifPermission={reminder.notifPermission}
          onRemove={removeIntake}
          onToggleTime={notifPrefs.toggleTime}
          onEnableAll={() => notifPrefs.enableAll(reminder.schedule)}
          onDisableAll={() => notifPrefs.disableAll(reminder.schedule)}
        />

        {/* Gradual plan progress */}
        {plan.currentWeek && (
          <PlanCard
            currentWeekNumber={plan.currentWeekNumber}
            totalWeeks={plan.totalWeeks}
            currentWeek={plan.currentWeek}
            nextWeek={plan.nextWeek}
            isOnFinalGoal={plan.isOnFinalGoal}
            daysIntoWeek={plan.daysIntoWeek}
            glassSizeMl={profile.glass_size_ml}
          />
        )}

        {/* Habit streak tracker */}
        <HabitCard
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          todayCompleted={streak.todayCompleted}
          nextMilestone={streak.nextMilestone}
          milestoneProgress={streak.milestoneProgress}
          level={streak.level}
        />

        {/* Journal history */}
        {journal.entries.length > 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setShowJournal((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-sky-400" />
                <span className="text-white/70 text-sm font-medium">Mi diario</span>
                <span className="bg-sky-500/20 text-sky-300 text-xs rounded-full px-2 py-0.5">
                  {journal.entries.length}
                </span>
              </div>
              {showJournal ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
            </button>

            {showJournal && (
              <div className="border-t border-white/8 divide-y divide-white/5">
                {[...journal.entries].reverse().map((entry, i) => (
                  <div key={i} className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-sky-300/80">
                        {entry.entry_type === 'expectation'
                          ? '🌱 Expectativa inicial'
                          : `📝 Reflexión — Semana ${entry.week_number}`}
                      </span>
                      <span className="text-white/20 text-xs ml-auto">
                        {format(new Date(entry.created_at), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                    <p className="text-white/55 text-xs leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
