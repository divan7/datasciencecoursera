import { useState } from 'react';
import { Droplets, ChevronRight, CheckCircle2 } from 'lucide-react';
import { buildHydrationPlan, INTAKE_OPTIONS, type CurrentIntakeOption } from '../data/plan';
import type { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onStart: (initialGlasses: number) => void;
}

export function WaterAssessment({ profile, onStart }: Props) {
  const [selected, setSelected] = useState<CurrentIntakeOption | null>(null);

  const plan = selected
    ? buildHydrationPlan(selected.glasses, profile.daily_goal_ml, profile.glass_size_ml)
    : [];

  const alreadyAtGoal =
    selected !== null &&
    selected.glasses * profile.glass_size_ml >= profile.daily_goal_ml;

  function formatMl(ml: number) {
    if (ml >= 1000) {
      const l = ml / 1000;
      return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L`;
    }
    return `${ml} ml`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex items-start justify-center p-4">
      <div className="w-full max-w-sm py-6 space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500/20 rounded-2xl border border-sky-400/30 mb-3 shadow-lg shadow-sky-500/20">
            <Droplets size={28} className="text-sky-400" />
          </div>
          <h1 className="text-2xl font-black text-white">Tu plan de hidratación</h1>
          <p className="text-sky-300/50 text-xs mt-1">Método científico de hidratación</p>
        </div>

        {/* ── INTRO TEXT ─────────────────────────────────────────── */}
        <div className="bg-white/6 rounded-2xl p-5 border border-white/10 space-y-4">

          <p className="text-sky-300 font-semibold text-sm">
            El agua: el suplemento más poderoso que existe
          </p>

          <p className="text-white/75 text-sm leading-relaxed">
            La ciencia es clara:{' '}
            <em className="text-sky-200 not-italic font-medium">
              "El metabolismo lento casi siempre tiene detrás un cuerpo deshidratado."
            </em>{' '}
            Y la solución no está en ningún suplemento caro — está en el grifo de tu casa.
          </p>

          <p className="text-white/65 text-sm leading-relaxed">
            Ya calculamos la cantidad exacta que tu cuerpo necesita según tu peso y nivel
            de actividad. Pero si llevas tiempo sin tomarla, ir directo a esa cantidad
            es difícil de sostener y muchas personas abandonan a los pocos días.
          </p>

          <div className="border-t border-white/8 pt-4 space-y-2">
            <p className="text-white/85 text-sm font-semibold">
              Por eso seguiremos un enfoque gradual y sostenible:
            </p>
            <p className="text-sky-200/80 text-sm leading-relaxed">
              Sumar <strong className="text-sky-300">2 vasos por semana</strong> hasta llegar
              a tu meta. El cuerpo reactiva su mecanismo natural de sed en apenas{' '}
              <strong className="text-sky-300">3 días</strong> — después de eso, ya no lo
              olvidarás.
            </p>
          </div>

          {/* Quick benefits grid */}
          <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-1">
            {[
              { emoji: '⚡', text: 'Más energía en días' },
              { emoji: '✨', text: 'Piel clara en 2 semanas' },
              { emoji: '🔥', text: 'Metabolismo activo' },
              { emoji: '🏆', text: 'Hábito de por vida' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-1.5 text-xs text-white/45">
                <span>{item.emoji}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs border-t border-white/8 pt-3 leading-snug">
            Tu meta final: <strong className="text-white/60">{formatMl(profile.daily_goal_ml)}/día</strong>{' '}
            ({Math.ceil(profile.daily_goal_ml / profile.glass_size_ml)} vasos de {profile.glass_size_ml} ml)
            — calculada según tu peso y nivel de actividad para {profile.weight_kg} kg.
          </p>
        </div>

        {/* ── ASSESSMENT ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <div>
            <p className="text-white font-semibold text-sm">
              ¿Cuántos vasos de agua pura tomas al día actualmente?
            </p>
            <p className="text-white/30 text-xs mt-0.5">
              Solo agua — no café, jugos, refrescos ni infusiones
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {INTAKE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt)}
                className={`text-left p-4 rounded-2xl border transition-all ${
                  selected?.value === opt.value
                    ? 'bg-sky-500/25 border-sky-400/60 shadow-sm shadow-sky-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/25 active:scale-95'
                }`}
              >
                <div className="text-2xl mb-2">{opt.emoji}</div>
                <div className={`text-sm font-bold leading-tight ${
                  selected?.value === opt.value ? 'text-white' : 'text-white/80'
                }`}>
                  {opt.label}
                </div>
                <div className="text-xs text-white/35 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── PLAN PREVIEW ────────────────────────────────────────── */}
        {selected && !alreadyAtGoal && plan.length > 0 && (
          <div className="bg-white/6 rounded-2xl p-4 border border-white/10 space-y-2">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">
              Tu plan semana a semana
            </p>

            {plan.map((week, i) => (
              <div key={week.weekNumber} className="flex items-center gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  week.isGoalWeek
                    ? 'bg-sky-500/30 text-sky-300'
                    : i === 0
                      ? 'bg-white/15 text-white'
                      : 'bg-white/6 text-white/40'
                }`}>
                  {week.isGoalWeek ? '🏆' : i === 0 ? '📍' : '→'}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${
                    week.isGoalWeek
                      ? 'text-sky-300 font-semibold'
                      : i === 0
                        ? 'text-white font-medium'
                        : 'text-white/45'
                  }`}>
                    {week.isGoalWeek
                      ? `Semana ${week.weekNumber} — Tu meta`
                      : `Semana ${week.weekNumber}`}
                  </span>
                  {i === 0 && (
                    <span className="text-white/25 text-xs ml-1.5">(esta semana)</span>
                  )}
                </div>

                {/* Amount */}
                <div className={`text-sm tabular-nums text-right ${
                  week.isGoalWeek
                    ? 'text-sky-300 font-semibold'
                    : i === 0
                      ? 'text-white font-medium'
                      : 'text-white/40'
                }`}>
                  {week.glassesPerDay}v · {formatMl(week.dailyGoalMl)}
                </div>
              </div>
            ))}

            <p className="text-white/20 text-xs pt-2 leading-snug border-t border-white/8 mt-2">
              El plan avanza automáticamente cada 7 días. Sin presión — a tu ritmo.
            </p>
          </div>
        )}

        {/* Already at goal */}
        {selected && alreadyAtGoal && (
          <div className="bg-emerald-500/20 rounded-2xl p-4 border border-emerald-400/30 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">¡Ya alcanzas tu meta diaria!</p>
              <p className="text-emerald-300/70 text-xs mt-0.5">
                Ahora el objetivo es hacerlo un hábito permanente.
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        {selected && (
          <button
            onClick={() => onStart(selected.glasses)}
            className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 active:scale-98 text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg shadow-sky-500/30"
          >
            {alreadyAtGoal ? '¡Mantener el hábito!' : '¡Empezar mi plan!'}
            <ChevronRight size={18} />
          </button>
        )}

        {!selected && (
          <p className="text-center text-white/20 text-xs pb-2">
            Selecciona una opción para ver tu plan
          </p>
        )}
      </div>
    </div>
  );
}
