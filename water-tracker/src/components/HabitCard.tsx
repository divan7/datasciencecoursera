import { Flame, Trophy } from 'lucide-react';

interface Props {
  currentStreak: number;
  longestStreak: number;
  todayCompleted: boolean;
  nextMilestone: number;
  milestoneProgress: number;
  level: { label: string; emoji: string };
}

const MILESTONE_LABELS: Record<number, string> = {
  3:  'Día 3: el cuerpo reactiva su mecanismo natural de sed',
  21: 'Psicología: el hábito empieza a arraigarse',
  66: 'Neurociencia: hábito profundamente consolidado',
};

export function HabitCard({
  currentStreak,
  longestStreak,
  todayCompleted,
  nextMilestone,
  milestoneProgress,
  level,
}: Props) {
  const pct = Math.min(100, Math.max(0, milestoneProgress));

  return (
    <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame
            size={18}
            className={currentStreak > 0 ? 'text-orange-400' : 'text-white/30'}
            fill={currentStreak > 0 ? '#fb923c' : 'transparent'}
          />
          <span className="text-white font-semibold text-sm">Racha de hidratación</span>
        </div>
        {longestStreak > 0 && (
          <div className="flex items-center gap-1 text-white/30 text-xs">
            <Trophy size={11} />
            <span>récord: {longestStreak}d</span>
          </div>
        )}
      </div>

      {/* Streak count + level */}
      <div className="flex items-end gap-3 mb-3">
        <div>
          <span className="text-5xl font-black text-white tabular-nums leading-none">
            {currentStreak}
          </span>
          <span className="text-white/40 text-sm ml-1">días</span>
        </div>
        <div className="pb-1">
          <div className="text-sm font-semibold text-sky-300">
            {level.emoji} {level.label}
          </div>
          {todayCompleted && (
            <div className="text-xs text-emerald-400">✓ Meta de hoy completada</div>
          )}
          {!todayCompleted && currentStreak > 0 && (
            <div className="text-xs text-white/40">Completa hoy para mantener la racha</div>
          )}
        </div>
      </div>

      {/* Progress to next milestone */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-white/40">
          <span>Próximo hito: {nextMilestone} días</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-sky-500 to-cyan-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-white/30 leading-snug">
          {MILESTONE_LABELS[nextMilestone]}
        </p>
      </div>
    </div>
  );
}
