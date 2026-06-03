import { TrendingUp } from 'lucide-react';
import type { PlanWeek } from '../data/plan';

interface Props {
  currentWeekNumber: number;
  totalWeeks: number;
  currentWeek: PlanWeek;
  nextWeek: PlanWeek | null;
  isOnFinalGoal: boolean;
  daysIntoWeek: number;
  glassSizeMl: number;
}

export function PlanCard({
  currentWeekNumber,
  totalWeeks,
  currentWeek,
  nextWeek,
  isOnFinalGoal,
  daysIntoWeek,
  glassSizeMl,
}: Props) {
  const weekPct = Math.min(100, ((daysIntoWeek) / 7) * 100);

  function fmt(ml: number) {
    if (ml >= 1000) {
      const l = ml / 1000;
      return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L`;
    }
    return `${ml} ml`;
  }

  return (
    <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-sky-400" />
          <span className="text-white font-semibold text-sm">Plan gradual</span>
        </div>
        <span className="text-white/30 text-xs">
          Semana {currentWeekNumber} / {totalWeeks}
        </span>
      </div>

      {/* Current week goal */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white/40 text-xs mb-0.5">Meta de esta semana</p>
          <p className="text-white font-black text-2xl leading-none">
            {fmt(currentWeek.dailyGoalMl)}
            <span className="text-white/30 text-sm font-normal ml-1">/ día</span>
          </p>
          <p className="text-sky-300/60 text-xs mt-1">
            {currentWeek.glassesPerDay} vasos de {glassSizeMl} ml
          </p>
        </div>

        {isOnFinalGoal ? (
          <div className="text-right">
            <div className="text-3xl">🏆</div>
            <p className="text-sky-300 text-xs font-semibold mt-0.5">¡Meta de hidratación alcanzada!</p>
          </div>
        ) : nextWeek ? (
          <div className="text-right bg-white/5 rounded-xl px-3 py-2 border border-white/8">
            <p className="text-white/30 text-xs">Semana {currentWeekNumber + 1}</p>
            <p className="text-white/60 text-sm font-bold">{fmt(nextWeek.dailyGoalMl)}</p>
            <p className="text-white/25 text-xs">{nextWeek.glassesPerDay} vasos</p>
          </div>
        ) : null}
      </div>

      {/* Week progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-white/25">
          <span>Progreso de la semana</span>
          <span>Día {daysIntoWeek + 1} de 7</span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-700"
            style={{ width: `${weekPct}%` }}
          />
        </div>
        {!isOnFinalGoal && (
          <p className="text-white/20 text-xs">
            {7 - daysIntoWeek - 1 > 0
              ? `Faltan ${7 - daysIntoWeek - 1} días para avanzar a la siguiente semana`
              : 'Último día de esta semana — ¡mañana sube la meta!'}
          </p>
        )}
      </div>
    </div>
  );
}
