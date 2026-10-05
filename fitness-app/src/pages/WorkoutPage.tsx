import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, Circle, Timer,
  Info, Flame, SkipForward, Star, AlertTriangle,
  Volume2, VolumeX, Mic, PlayCircle, Bell, BellOff,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { exercises } from '../data/exercises'
import { allWorkouts } from '../data/programs'
import { muscleFocusMap } from '../data/muscleFocus'
import { workoutCoachNotes } from '../data/coachNotes'
import { CoachNoteCard } from '../components/CoachPanel'
import { getEquipmentMismatch } from '../data/equipmentAdvice'
import { useWorkoutSpeech, type AudioMode } from '../hooks/useWorkoutSpeech'
import { format } from 'date-fns'
import type { ExerciseLog, MuscleGroup, MuscleFocusId } from '../types'

const muscleLabels: Record<string, string> = {
  core: 'Core', glutes: 'Glúteos', quads: 'Cuádriceps', hamstrings: 'Isquiotibiales',
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', arms: 'Brazos',
  calves: 'Pantorrillas', full_body: 'Cuerpo completo', mobility: 'Movilidad',
}

const difficultyLabel = ['', 'Básico', 'Intermedio', 'Avanzado']
const difficultyColor = ['', 'text-emerald-400', 'text-orange-400', 'text-red-400']

const COACH_SET_MSGS = [
  (rest: number) => `¡Bien hecho! Descansa ${rest} segundos.`,
  (rest: number) => `Serie completada. ${rest} segundos de descanso.`,
  (rest: number) => `Excelente técnica. Descansa ${rest} segundos.`,
  (rest: number) => `Perfecta ejecución. ${rest} segundos y volvemos.`,
]

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

function createBeep(freq: number, dur: number, vol: number) {
  try {
    const ACtx = window.AudioContext
      ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new ACtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000)
    osc.start()
    osc.stop(ctx.currentTime + dur / 1000)
    setTimeout(() => ctx.close(), dur + 200)
  } catch (_) {}
}

export default function WorkoutPage() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const { activeUser, activeProgram, logWorkout } = useAppStore()
  const { speak, speakSequence, stop, isSupported: speechSupported } = useWorkoutSpeech()

  const workout = allWorkouts.find(w => w.id === workoutId)
  const [expandedEx, setExpandedEx] = useState<string | null>(null)
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [overallFeel, setOverallFeel] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [startTime] = useState(Date.now())
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restCoachTip, setRestCoachTip] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [audioMode, setAudioMode] = useState<AudioMode>('off')
  const [beepEnabled, setBeepEnabled] = useState(true)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioModeRef = useRef<AudioMode>('off')
  audioModeRef.current = audioMode
  const speakRef = useRef(speak)
  speakRef.current = speak
  const beepEnabledRef = useRef(true)
  beepEnabledRef.current = beepEnabled
  const silentAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!workout) return
    const init: Record<string, boolean[]> = {}
    workout.exercises.forEach(we => {
      init[we.exerciseId] = Array(we.sets).fill(false)
    })
    setCompletedSets(init)
  }, [workout])

  /* Keep audio alive when screen dims (silent loop + wake lock) */
  useEffect(() => {
    if (audioMode === 'off') {
      silentAudioRef.current?.pause()
      return
    }
    const audio = new Audio(
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    )
    audio.loop = true
    audio.volume = 0.001
    silentAudioRef.current = audio
    audio.play().catch(() => {})

    let wl: { release(): Promise<void> } | null = null
    const nav = navigator as Navigator & {
      wakeLock?: { request(type: string): Promise<{ release(): Promise<void> }> }
    }
    if (nav.wakeLock) {
      nav.wakeLock.request('screen').then(w => { wl = w }).catch(() => {})
    }

    return () => {
      audio.pause()
      wl?.release().catch(() => {})
    }
  }, [audioMode])

  /* Rest countdown with beeps */
  useEffect(() => {
    if (restTimer === null) return
    if (restTimer > 0) {
      timerRef.current = setTimeout(() => setRestTimer(t => (t ?? 1) - 1), 1000)
      if (beepEnabledRef.current) {
        if (restTimer === 10) createBeep(660, 120, 0.25)
        else if (restTimer <= 5) createBeep(880, 100, 0.4)
      }
    } else {
      setRestTimer(null)
      setRestCoachTip(null)
      if (audioModeRef.current === 'coach') {
        speakRef.current('¡Tiempo! A por la siguiente serie.')
      }
      if (beepEnabledRef.current) {
        createBeep(1047, 200, 0.5)
        setTimeout(() => createBeep(1047, 200, 0.5), 300)
      }
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
  const activeLocation = activeUser.activeLocation ?? 'home'
  const equipmentConflict = getEquipmentMismatch(currentPhase.id, activeLocation)

  function cycleAudioMode() {
    const next: AudioMode = audioMode === 'off' ? 'guide' : audioMode === 'guide' ? 'coach' : 'off'
    setAudioMode(next)
    if (next === 'off') {
      stop()
    } else if (next === 'guide') {
      speak('Modo guiado activado. Toca el botón de audio en cada ejercicio para escuchar las instrucciones.')
    } else {
      speak('Modo entrenador activado. Te acompaño durante todo el entrenamiento.')
    }
  }

  function handleExerciseExpand(exId: string) {
    const isOpening = expandedEx !== exId
    setExpandedEx(isOpening ? exId : null)
    if (isOpening && audioMode === 'coach') {
      const ex = exercises.find(e => e.id === exId)
      const we = workout!.exercises.find(w => w.exerciseId === exId)
      if (ex && we) {
        speak(`${ex.nameEs}. ${we.sets} series de ${we.reps}. ${ex.instructions[0]}`)
      }
    }
  }

  function playExerciseGuide(exId: string) {
    const ex = exercises.find(e => e.id === exId)
    if (!ex) return
    const texts = [
      ex.nameEs,
      ...ex.instructions,
      ...(ex.tips.length > 0 ? [`Consejos: ${ex.tips.slice(0, 2).join('. ')}`] : []),
    ]
    speakSequence(texts)
  }

  function toggleSet(exId: string, setIdx: number, restSecs: number) {
    const currentSets = completedSets[exId] ?? []
    const wasCompleted = currentSets[setIdx]

    setCompletedSets(prev => {
      const newSets = [...(prev[exId] ?? [])]
      newSets[setIdx] = !newSets[setIdx]
      return { ...prev, [exId]: newSets }
    })

    if (!wasCompleted) {
      setRestTimer(restSecs)

      if (audioMode === 'coach') {
        const newCount = currentSets.filter(Boolean).length + 1
        const total = currentSets.length
        const ex = exercises.find(e => e.id === exId)

        if (newCount === total && ex) {
          const weIdx = workout!.exercises.findIndex(we => we.exerciseId === exId)
          const nextWe = workout!.exercises[weIdx + 1]
          const nextExData = nextWe ? exercises.find(e => e.id === nextWe.exerciseId) : null
          const tip = ex.tips[0] ? ` Recuerda: ${ex.tips[0]}.` : ''
          const nextMsg = nextExData
            ? `Ejercicio completado.${tip} Siguiente: ${nextExData.nameEs}.`
            : `¡Excelente! Último ejercicio completado.${tip}`
          speak(nextMsg)
          if (ex.tips[1]) setRestCoachTip(ex.tips[1])
        } else {
          const tip = ex?.tips[newCount % (ex.tips.length || 1)] ?? null
          const msgFn = COACH_SET_MSGS[(newCount - 1) % COACH_SET_MSGS.length]
          const tipSuffix = tip ? ` ${tip}` : ''
          speak(msgFn(restSecs) + tipSuffix)
          setRestCoachTip(tip)
        }
      }
    }
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
    if (audioMode === 'coach') speak('¡Entrenamiento finalizado! Excelente trabajo.')
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

  const audioIcon = audioMode === 'off'
    ? <VolumeX size={18} />
    : audioMode === 'guide'
    ? <Volume2 size={18} />
    : <Mic size={18} />

  const audioLabel = audioMode === 'off' ? 'Audio off' : audioMode === 'guide' ? 'Guiado' : 'Coach'

  const audioColors = audioMode === 'off'
    ? 'bg-zinc-800 border-zinc-700 text-zinc-500'
    : audioMode === 'guide'
    ? 'bg-violet-400/20 border-violet-400/40 text-violet-400'
    : 'bg-cyan-400/20 border-cyan-400/40 text-cyan-400'

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
          {speechSupported && (
            <button
              onClick={cycleAudioMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-xs font-medium shrink-0 ${audioColors}`}
              title="Cambiar modo de audio"
            >
              {audioIcon}
              <span className="hidden sm:inline">{audioLabel}</span>
            </button>
          )}
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
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <Timer size={16} />
                <span className="text-sm font-semibold">Descansando...</span>
                {restTimer <= 10 && restTimer > 0 && (
                  <span className="text-xs text-amber-400 animate-pulse">¡Prepárate!</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold tabular-nums ${restTimer <= 5 ? 'text-amber-400' : 'text-white'}`}>
                  {restTimer}s
                </span>
                <button
                  onClick={() => setBeepEnabled(b => !b)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    beepEnabled ? 'bg-cyan-400/10 text-cyan-400' : 'bg-zinc-800 text-zinc-600'
                  }`}
                  title={beepEnabled ? 'Silenciar alertas' : 'Activar alertas'}
                >
                  {beepEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
                <button
                  onClick={() => { setRestTimer(null); setRestCoachTip(null) }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:text-white transition-colors"
                >
                  <SkipForward size={12} /> Saltar
                </button>
              </div>
            </div>
            {audioMode === 'coach' && restCoachTip && (
              <p className="text-xs text-zinc-500 italic border-l-2 border-cyan-400/30 pl-3">{restCoachTip}</p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-32">
        {/* Equipment conflict warning */}
        {equipmentConflict && (
          <div className={`flex gap-3 p-4 rounded-2xl border ${
            equipmentConflict.severity === 'critical'
              ? 'bg-red-400/5 border-red-400/30'
              : 'bg-orange-400/5 border-orange-400/30'
          }`}>
            <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${equipmentConflict.severity === 'critical' ? 'text-red-400' : 'text-orange-400'}`} />
            <p className="text-sm text-zinc-400 leading-relaxed">{equipmentConflict.message}</p>
          </div>
        )}

        {/* Workout rationale */}
        {workoutCoachNotes[workout.id] && (
          <CoachNoteCard note={workoutCoachNotes[workout.id]} defaultOpen={false} />
        )}

        {/* Audio mode banner */}
        {audioMode !== 'off' && speechSupported && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
            audioMode === 'guide'
              ? 'bg-violet-400/5 border-violet-400/20 text-violet-300'
              : 'bg-cyan-400/5 border-cyan-400/20 text-cyan-300'
          }`}>
            {audioMode === 'guide' ? <Volume2 size={14} className="shrink-0" /> : <Mic size={14} className="shrink-0" />}
            {audioMode === 'guide'
              ? 'Modo guiado: toca el botón de audio en cada ejercicio para escuchar las instrucciones.'
              : 'Modo entrenador: te acompañaré durante el entrenamiento con indicaciones automáticas.'}
          </div>
        )}

        {workout.exercises.map((we, idx) => {
          const ex = exercises.find(e => e.id === we.exerciseId)
          if (!ex) return null
          const sets = completedSets[ex.id] ?? []
          const allDone = sets.every(Boolean)
          const isExpanded = expandedEx === ex.id
          const exPriority = getExercisePriority(ex.muscles, activeUser.musclePriorities ?? {})
          const needsGym = ex.equipment.includes('gym')
          const gymUnavailable = needsGym && activeLocation === 'home'

          return (
            <div
              key={ex.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                allDone
                  ? 'border-emerald-400/30 bg-emerald-400/5'
                  : gymUnavailable
                  ? 'border-orange-400/20 bg-orange-400/3'
                  : exPriority === 'high'
                  ? 'border-cyan-400/30 bg-cyan-400/3'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              {/* Exercise header */}
              <button
                type="button"
                onClick={() => handleExerciseExpand(ex.id)}
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
                    <p className={`font-semibold ${allDone ? 'text-emerald-400' : gymUnavailable ? 'text-orange-300' : 'text-white'}`}>
                      {ex.nameEs}
                    </p>
                    {allDone && <CheckCircle2 size={14} className="text-emerald-400" />}
                    {!allDone && gymUnavailable && (
                      <span className="text-xs text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full">
                        🏋️ Requiere gym
                      </span>
                    )}
                    {!allDone && !gymUnavailable && exPriority === 'high' && (
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

              {/* Sets + inline tip */}
              <div className="px-4 pb-4">
                <div className="flex gap-2 flex-wrap mb-2">
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
                {/* Always-visible first tip */}
                {ex.tips.length > 0 && (
                  <p className="text-[11px] text-amber-400/80 flex gap-1.5 items-start mt-1">
                    <span className="shrink-0">💡</span>
                    <span>{ex.tips[0]}</span>
                  </p>
                )}
              </div>

              {/* Exercise detail (expanded) */}
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Info size={13} className="text-violet-400" />
                        <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Cómo ejecutarlo</p>
                      </div>
                      {speechSupported && audioMode === 'guide' && (
                        <button
                          onClick={() => playExerciseGuide(ex.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-400/10 border border-violet-400/30 rounded-lg text-violet-400 text-xs hover:bg-violet-400/20 transition-colors"
                        >
                          <Volume2 size={12} />
                          Escuchar
                        </button>
                      )}
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

                  {ex.tips.length > 1 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Flame size={13} className="text-orange-400" />
                        <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider">Tips adicionales</p>
                      </div>
                      <ul className="space-y-1">
                        {ex.tips.slice(1).map((tip, i) => (
                          <li key={i} className="text-sm text-zinc-400 flex gap-2">
                            <span className="text-orange-400 shrink-0">→</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Video link */}
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.videoKeyword)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm hover:bg-red-500/20 transition-colors w-full"
                  >
                    <PlayCircle size={15} />
                    <span className="flex-1">Ver en YouTube</span>
                    <span className="text-xs text-zinc-600">{ex.videoKeyword}</span>
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
