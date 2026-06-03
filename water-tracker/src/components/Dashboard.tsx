import { Settings, LogOut, Droplets } from 'lucide-react';
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
import type { UserProfile } from '../types';
import type { usePlan } from '../hooks/usePlan';

type PlanHook = ReturnType<typeof usePlan>;

interface Props {
  profile: UserProfile;
  plan: PlanHook;
  userId: string | null;
  onEditProfile: () => void;
  onLogout: () => void;
}

export function Dashboard({ profile, plan, userId, onEditProfile, onLogout }: Props) {
  const { logs, totalMl, addIntake, removeIntake } = useIntake(userId);

  // Use the current week's goal from the plan (not the final profile goal)
  const effectiveGoalMl = plan.currentGoalMl;

  const reminder = useReminder(profile, totalMl, effectiveGoalMl);
  const streak   = useStreak(totalMl, effectiveGoalMl);

  const pct   = effectiveGoalMl > 0 ? Math.min(100, (totalMl / effectiveGoalMl) * 100) : 0;
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  async function handleLogPastDrink(amountMl: number, timeStr: string) {
    const [h, m] = timeStr.split(':').map(Number);
    const past = new Date();
    past.setHours(h, m, 0, 0);
    if (past > new Date()) past.setTime(new Date().getTime() - 60_000);
    await addIntake(amountMl, past);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex flex-col">

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
          onRequestPermission={reminder.requestPermission}
          onLogPastDrink={handleLogPastDrink}
        />

        {/* Quick add */}
        <QuickAdd glassSizeMl={profile.glass_size_ml} onAdd={addIntake} />

        {/* Scheduled intake timeline */}
        <IntakeTimeline
          logs={logs}
          schedule={reminder.schedule}
          glassSizeMl={profile.glass_size_ml}
          onRemove={removeIntake}
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
      </div>
    </div>
  );
}
