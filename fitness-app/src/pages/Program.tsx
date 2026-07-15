import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Lock, ChevronDown, ChevronUp, Play, Check, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { phaseCoachNotes } from '../data/coachNotes'
import { CoachNoteCard } from '../components/CoachPanel'

export default function Program() {
  const navigate = useNavigate()
  const { activeProgram, activeUser, advancePhase, advanceWeek, getWeekCompletionRate } = useAppStore()
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null)
  const [showAdvance, setShowAdvance] = useState(false)

  if (!activeProgram || !activeUser) return null

  const currentPhaseIdx = activeProgram.currentPhaseIndex
  const currentPhase = activeProgram.phases[currentPhaseIdx]
  const weekRate = getWeekCompletionRate(activeUser.id, currentPhase.id, activeProgram.currentWeek)
  const isWeekDone = weekRate >= 0.8

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tu Programa</h1>
        <p className="text-zinc-500 text-sm mt-1">5 fases de progresión controlada hacia el running</p>
      </div>

      {/* Phase timeline */}
      <div className="space-y-3">
        {activeProgram.phases.map((phase, idx) => {
          const isActive = idx === currentPhaseIdx
          const isDone = idx < currentPhaseIdx
          const isLocked = idx > currentPhaseIdx
          const isOpen = expandedPhase === idx

          return (
            <div
              key={phase.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                isActive
                  ? 'border-cyan-400/40 bg-cyan-400/5'
                  : isDone
                  ? 'border-emerald-400/20 bg-emerald-400/5'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              {/* Phase header */}
              <button
                type="button"
                onClick={() => setExpandedPhase(isOpen ? null : idx)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left"
              >
                {/* Status icon */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isDone
                      ? 'bg-emerald-400/20'
                      : isActive
                      ? 'bg-cyan-400/20 ring-2 ring-cyan-400/40'
                      : 'bg-zinc-800'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : isActive ? (
                    <span className="text-cyan-400 font-bold text-sm">{phase.id}</span>
                  ) : (
                    <Lock size={14} className="text-zinc-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        isActive ? 'text-cyan-400' : isDone ? 'text-emerald-400' : 'text-zinc-600'
                      }`}
                    >
                      {isDone ? 'Completada' : isActive ? 'En curso' : 'Próxima'}
                    </span>
                  </div>
                  <p className={`font-semibold mt-0.5 ${isLocked ? 'text-zinc-500' : 'text-white'}`}>
                    {phase.name}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {phase.durationWeeks} semanas · {phase.workoutsPerWeek}x/semana · {phase.targetMinutes[0]}-{phase.targetMinutes[1]} min
                  </p>
                </div>

                {isOpen ? <ChevronUp size={16} className="text-zinc-500 shrink-0" /> : <ChevronDown size={16} className="text-zinc-500 shrink-0" />}
              </button>

              {/* Phase detail */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-4">
                  <p className="text-zinc-400 text-sm">{phase.description}</p>

                  {/* Technical coach note */}
                  {phaseCoachNotes[phase.id] && (
                    <CoachNoteCard note={phaseCoachNotes[phase.id]} defaultOpen={false} />
                  )}

                  {/* Week schedule */}
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Horario semanal</p>
                    <div className="grid grid-cols-7 gap-1">
                      {Object.entries(phase.weekSchedule).map(([day, workout]) => (
                        <div
                          key={day}
                          className={`rounded-lg p-1.5 text-center ${
                            workout === 'Descanso'
                              ? 'bg-zinc-800/50'
                              : isActive
                              ? 'bg-cyan-400/10 border border-cyan-400/30'
                              : isDone
                              ? 'bg-emerald-400/10 border border-emerald-400/20'
                              : 'bg-zinc-800'
                          }`}
                        >
                          <p className="text-xs text-zinc-500">{day}</p>
                          <p className={`text-xs font-semibold mt-0.5 ${workout === 'Descanso' ? 'text-zinc-600' : isActive ? 'text-cyan-400' : isDone ? 'text-emerald-400' : 'text-zinc-400'}`}>
                            {workout === 'Descanso' ? '—' : workout}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Workouts */}
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Sesiones</p>
                    <div className="space-y-2">
                      {phase.workouts.map(w => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between bg-zinc-800/60 rounded-xl px-4 py-3"
                        >
                          <div>
                            <p className="text-white text-sm font-medium">{w.name}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">{w.exercises.length} ejercicios · ~{w.estimatedMinutes} min</p>
                          </div>
                          {isActive && (
                            <button
                              onClick={() => navigate(`/workout/${w.id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 rounded-lg text-xs hover:bg-cyan-400/20 transition-colors"
                            >
                              <Play size={12} fill="currentColor" />
                              Iniciar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advancement criteria */}
                  {isActive && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Criterios para avanzar</p>
                      <div className="space-y-2">
                        {phase.advancementCriteria.map((c, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="w-4 h-4 rounded border border-zinc-600 mt-0.5 shrink-0 flex items-center justify-center">
                              <Check size={10} className="text-zinc-600" />
                            </div>
                            <p className="text-zinc-400 text-sm">{c}</p>
                          </div>
                        ))}
                      </div>

                      {isWeekDone && activeProgram.currentWeek >= phase.durationWeeks && (
                        <button
                          onClick={() => setShowAdvance(true)}
                          className="mt-4 w-full py-2.5 bg-violet-400/10 border border-violet-400/40 text-violet-300 rounded-xl text-sm font-semibold hover:bg-violet-400/20 transition-colors"
                        >
                          Solicitar avance de fase
                        </button>
                      )}

                      {isWeekDone && activeProgram.currentWeek < phase.durationWeeks && (
                        <button
                          onClick={advanceWeek}
                          className="mt-4 w-full py-2.5 bg-cyan-400/10 border border-cyan-400/40 text-cyan-300 rounded-xl text-sm font-semibold hover:bg-cyan-400/20 transition-colors"
                        >
                          Avanzar a semana {activeProgram.currentWeek + 1}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Advance phase modal */}
      {showAdvance && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-violet-400" />
              <h3 className="text-white font-semibold">¿Avanzar de fase?</h3>
            </div>
            <p className="text-zinc-400 text-sm">
              Antes de avanzar, confirma que cumples los criterios de la fase actual. El progreso no se puede revertir automáticamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdvance(false)}
                className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => { advancePhase(); setShowAdvance(false) }}
                className="flex-1 py-2.5 bg-violet-400 text-zinc-950 font-bold rounded-xl text-sm hover:bg-violet-300 transition-colors"
              >
                Sí, avanzar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
