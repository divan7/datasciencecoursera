import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, Circle, Timer,
  Info, Flame, SkipForward, Star,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { exercises } from '../data/exercises'
import { allWorkouts } from '../data/programs'
import { muscleFocusMap } from '../data/muscleFocus'
import { format } from 'date-fns'
import type { ExerciseLog, MuscleGroup, MuscleFocusId } from '../types'

const muscleLabels: Record<string, string> = {
  core: 'Core', glutes: 'Glúteos', quads: 'Cuádriceps', hamstrings: 'Isquiotibiales',
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', arms: 'Brazos',
  calves: 'Pantorrillas', full_body: 'Cuerpo completo', mobility: 'Movilidad',
}

const difficultyLabel = ['', 'Básico', 'Intermedio', 'Avanzado']
const difficultyColor = ['', 'text-emerald-400', 'text-orange-400', 'text-red-400']

function getExercisePriority(
  muscles: MuscleGroup[],
  priorities: Record<string, string>
): 'high' | 'medium' | null {
  let best: 'high' | 'medium' | null = null
  for (const [focusId, focusMuscles] of Object.entries(muscleFocusMap)) {
    if (muscles.some(m => focusMuscles.includes(m))) {
      const p = priorities[focusId as MuscleFocusId]
      if (p === 'high') return 'high'
      if (p === 'medium') best = 'medium'
    }
  }
  return best
}

export default function WorkoutPage() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const { activeUser, activeProgram, logWorkout } = useAppStore()

  const workout = allWorkouts.find(w => w.id === workoutId)
  const [expandedEx, setExpandedEx] = useState<string | null>(null)
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [overallFeel, setOverallFeel] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [startTime] = useState(Date.now())
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!workout) return
    const init: Record<string, boolean[]> = {}
    workout.exercises.forEach(we => {
      init[we.exerciseId] = Array(we.sets).fill(false)
    })
    setCompletedSets(init)
  }, [workout])

  useEffect(() => {
    if (restTimer !== null && restTimer > 0) {
      timerRef.current = setTimeout(() => setRestTimer(t => (t ?? 1) - 1), 1000)
    } else if (restTimer === 0) {
      setRestTimer(null)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [restTimer])

  if (!workout || !activeUser || !activeProgram) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Entrenamiento no encontrado</p>
      </div>
    )
  }

  const currentPhase = activeProgram.phases[activeProgram.currentPhaseIndex]

  function toggleSet(exId: string, setIdx: number, restSecs: number) {
    setCompletedSets(prev => {
      const newSets = [...(prev[exId] ?? [])]
      const wasCompleted = newSets[setIdx]
      newSets[setIdx] = !wasCompleted
      if (!wasCompleted) {
        setRestTimer(restSecs)
      }
      return { ...prev, [exId]: newSets }
    })
  }

  const totalSets = workout.exercises.reduce((s, we) => s + we.sets, 0)
  const doneSets = Object.values(completedSets).reduce((s, arr) => s + arr.filter(Boolean).length, 0)
  const progress = totalSets > 0 ? doneSets / totalSets : 0

  function finishWorkout() {
    const logs: ExerciseLog[] = workout!.exercises.map(we => ({
      exerciseId: we.exerciseId,
      setsCompleted: (completedSets[we.exerciseId] ?? []).filter(Boolean).length,
      repsCompleted: Array(we.sets).fill(we.reps),
      felt: 3,
    }))
    setExerciseLogs(logs)
    setShowSummary(true)
  }

  function confirmFinish() {
    const durationMinutes = Math.round((Date.now() - startTime) / 60000)
    logWorkout({
      userId: activeUser!.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      workoutTemplateId: workout!.id,
      phaseId: currentPhase.id,
      week: activeProgram!.currentWeek,
      completed: true,
      durationMinutes: Math.max(durationMinutes, 1),
      exercises: exerciseLogs,
      notes: '',
      overallFeel,
    })
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 truncate">{workout.focus}</p>
            <h1 className="text-white font-semibold text-sm truncate">{workout.name}</h1>
          </div>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full shrink-0">
            ~{workout.estimatedMinutes} min
          </span>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1 text-right">{doneSets}/{totalSets} series</p>
        </div>
      </div>

      {/* Rest timer */}
      {restTimer !== null && (
        <div className="sticky top-[88px] z-30 bg-zinc-900 border-b border-zinc-800 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <Timer size={16} />
              <span className="text-sm font-semibold">Descansando...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white tabular-nums">{restTimer}s</span>
              <button
                onClick={() => setRestTimer(null)}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:text-white transition-colors"
              >
                <SkipForward size={12} /> Saltar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-32">
        {workout.exercises.map((we, idx) => {
          const ex = exercises.find(e => e.id === we.exerciseId)
          if (!ex) return null
          const sets = completedSets[ex.id] ?? []
          const allDone = sets.every(Boolean)
          const isExpanded = expandedEx === ex.id
          const exPriority = getExercisePriority(ex.muscles, activeUser.musclePriorities ?? {})

          return (
            <div
              key={ex.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                allDone
                  ? 'border-emerald-400/30 bg-emerald-400/5'
                  : exPriority === 'high'
                  ? 'border-cyan-400/30 bg-cyan-400/3'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              {/* Exercise header */}
              <button
                type="button"
                onClick={() => setExpandedEx(isExpanded ? null : ex.id)}
                className="w-full px-4 py-4 flex items-center gap-3 text-left"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                    exPriority === 'high'
                      ? 'bg-cyan-400/20 text-cyan-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold ${allDone ? 'text-emerald-400' : 'text-white'}`}>
                      {ex.nameEs}
                    </p>
                    {allDone && <CheckCircle2 size={14} className="text-emerald-400" />}
                    {!allDone && exPriority === 'high' && (
                      <span className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded-full">
                        <Star size={10} fill="currentColor" /> Prioritario
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {we.sets} series × {we.reps} · descanso {we.restSeconds}s
                  </p>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-zinc-500 shrink-0" /> : <ChevronDown size={16} className="text-zinc-500 shrink-0" />}
              </button>

              {/* Sets */}
              <div className="px-4 pb-4">
                <div className="flex gap-2 flex-wrap mb-3">
                  {sets.map((done, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSet(ex.id, i, we.restSeconds)}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                        done
                          ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                      }`}
                    >
                      {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600">Toca cada cuadro al completar la serie</p>
              </div>

              {/* Exercise detail */}
              {isExpanded && (
                <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 ${difficultyColor[ex.difficulty]}`}>
                      {difficultyLabel[ex.difficulty]}
                    </span>
                    {ex.muscles.map(m => (
                      <span key={m} className="text-xs text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-800">
                        {muscleLabels[m] ?? m}
                      </span>
                    ))}
                    {ex.kneeSafe && (
                      <span className="text-xs text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-400/10">
                        ✓ Seguro para rodillas
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-400 text-sm">{ex.description}</p>

                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Info size={13} className="text-violet-400" />
                      <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Cómo ejecutarlo</p>
                    </div>
                    <ol className="space-y-1.5">
                      {ex.instructions.map((ins, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-zinc-400">
                          <span className="text-cyan-400 font-bold shrink-0">{i + 1}.</span>
                          {ins}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {ex.tips.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Flame size={13} className="text-orange-400" />
                        <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider">Tips clave</p>
                      </div>
                      <ul className="space-y-1">
                        {ex.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-zinc-400 flex gap-2">
                            <span className="text-orange-400 shrink-0">→</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-zinc-600">Fuente: {ex.source}</p>

                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.videoKeyword)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    <span>▶</span>
                    Ver demostración en YouTube ({ex.videoKeyword})
                  </a>
                </div>
              )}
            </div>
          )
        })}

        {/* Finish button */}
        <button
          onClick={finishWorkout}
          disabled={doneSets === 0}
          className="w-full py-4 bg-cyan-400 text-zinc-950 font-bold rounded-2xl hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-4"
        >
          Finalizar entrenamiento
        </button>
      </div>

      {/* Summary modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-2">🎉</div>
              <h3 className="text-xl font-bold text-white">¡Entrenamiento completado!</h3>
              <p className="text-zinc-400 text-sm mt-1">
                {doneSets} de {totalSets} series · {Math.round((Date.now() - startTime) / 60000)} min
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-400 mb-3 text-center">¿Cómo te sentiste en este entrenamiento?</p>
              <div className="flex justify-center gap-3">
                {([1, 2, 3, 4, 5] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setOverallFeel(n)}
                    className={`w-12 h-12 rounded-xl border-2 text-xl transition-all ${
                      overallFeel === n
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-zinc-700 bg-zinc-800'
                    }`}
                  >
                    {['😴', '😐', '🙂', '😄', '🔥'][n - 1]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={confirmFinish}
              className="w-full py-3 bg-cyan-400 text-zinc-950 font-bold rounded-xl hover:bg-cyan-300 transition-colors"
            >
              Guardar y terminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
