import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { MAX_SAVERS_PER_MONTH, isWithinGrace } from '../utils/streakRules';
import type { PendingDay } from '../hooks/useStreak';

interface Props {
  pending: PendingDay;
  currentStreak: number;
  saversRemaining: number;
  onConfirmForgot: () => void;
  onUseSaver: () => void;
  onAcceptLoss: () => void;
}

export function StreakRescueCard({
  pending,
  currentStreak,
  saversRemaining,
  onConfirmForgot,
  onUseSaver,
  onAcceptLoss,
}: Props) {
  const withinGrace = isWithinGrace(pending.totalMl, pending.goalMl);
  const [stage, setStage] = useState<'ask' | 'saver'>(withinGrace ? 'ask' : 'saver');

  const missingMl = Math.max(0, Math.round(pending.goalMl - pending.totalMl));
  const pct = Math.round((pending.totalMl / pending.goalMl) * 100);

  return (
    <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-400/30 space-y-3">
      <div className="flex items-center gap-2">
        <LifeBuoy size={18} className="text-amber-300" />
        <span className="text-white font-semibold text-sm">
          Tu racha de {currentStreak} {currentStreak === 1 ? 'día' : 'días'} está en juego
        </span>
      </div>

      {stage === 'ask' ? (
        <>
          <p className="text-white/70 text-sm leading-snug">
            Ayer registraste {pending.totalMl} ml ({pct}% de tu meta); te faltaron {missingMl} ml.
            ¿Olvidaste registrar alguna toma? Tienes hasta el final de hoy para confirmarlo.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onConfirmForgot}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
            >
              Sí, olvidé registrarla
            </button>
            <button
              onClick={() => setStage('saver')}
              className="bg-white/10 hover:bg-white/15 text-white/80 text-sm rounded-xl py-2.5 transition-colors"
            >
              No, no alcancé mi meta
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-white/70 text-sm leading-snug">
            Ayer no completaste tu meta ({pct}%, faltaron {missingMl} ml). Puedes usar un
            salvavidas para conservar tu racha: el día cubierto no suma, pero tampoco la rompe.
            Te quedan {saversRemaining} de {MAX_SAVERS_PER_MONTH} este mes.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onUseSaver}
              disabled={saversRemaining <= 0}
              className="bg-sky-500 hover:bg-sky-400 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
            >
              {saversRemaining > 0 ? 'Usar un salvavidas' : 'Sin salvavidas este mes'}
            </button>
            <button
              onClick={onAcceptLoss}
              className="bg-white/10 hover:bg-white/15 text-white/80 text-sm rounded-xl py-2.5 transition-colors"
            >
              Reiniciar mi racha
            </button>
          </div>
        </>
      )}
    </div>
  );
}
