import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Volume2, VolumeX, Mic,
  SkipForward, RotateCcw, ChevronDown, ChevronUp, Play,
} from 'lucide-react'
import { facialExercises } from '../data/facialExercises'
import { useWorkoutSpeech, type AudioMode } from '../hooks/useWorkoutSpeech'

function VideoCard({ keyword, nameEs }: { keyword: string; nameEs: string }) {
  const [open, setOpen] = useState(false)
  const src = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(keyword)}&rel=0`
  return (
    <div className="rounded-xl overflow-hidden border border-zinc-700">
      {open ? (
        <iframe src={src} title={`Tutorial: ${nameEs}`} className="w-full"
          style={{ aspectRatio: '16/9' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen />
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full relative bg-zinc-800 flex flex-col items-center justify-center gap-2 py-6">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/60 to-zinc-900/80" />
          <div className="relative w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <Play size={20} className="text-white ml-1" fill="white" />
          </div>
          <p className="relative text-sm text-zinc-300 font-medium">{nameEs}</p>
          <p className="relative text-xs text-zinc-500">Toca para ver tutorial en YouTube</p>
        </button>
      )}
    </div>
  )
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

function parseTargetReps(repsStr: string): number {
  const match = repsStr.match(/\d+/)
  return match ? parseInt(match[0]) : 10
}

export default function FacialPage() {
  const navigate = useNavigate()
  const { speak, speakSequence, stop, isSupported: speechSupported } = useWorkoutSpeech()

  const [audioMode, setAudioMode] = useState<AudioMode>('off')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Per-exercise rep counters
  const [repsCount, setRepsCount] = useState<Record<string, number>>({})

  // Hold timer state
  const [activeHoldId, setActiveHoldId] = useState<string | null>(null)
  const [holdTimer, setHoldTimer] = useState(0)
  const [holdTotal, setHoldTotal] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const audioModeRef = useRef<AudioMode>('off')
  audioModeRef.current = audioMode
  const speakRef = useRef(speak)
  speakRef.current = speak

  /* Hold countdown */
  useEffect(() => {
    if (activeHoldId === null) return
    if (holdTimer > 0) {
      timerRef.current = setTimeout(() => setHoldTimer(t => t - 1), 1000)
    } else {
      // Rep complete
      const exId = activeHoldId
      setActiveHoldId(null)
      setRepsCount(prev => ({ ...prev, [exId]: (prev[exId] ?? 0) + 1 }))
      createBeep(1047, 200, 0.5)
      setTimeout(() => createBeep(1047, 200, 0.5), 300)
      if (audioModeRef.current !== 'off') {
        speakRef.current('¡Bien! Descansa y repite.')
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [holdTimer, activeHoldId])

  function startHold(exId: string, secs: number) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setActiveHoldId(exId)
    setHoldTimer(secs)
    setHoldTotal(secs)
    if (audioModeRef.current !== 'off') {
      const ex = facialExercises.find(e => e.id === exId)
      if (ex) speakRef.current(`${ex.nameEs}. Mantén ${secs} segundos.`)
    }
  }

  function skipHold() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setActiveHoldId(null)
  }

  function resetReps(exId: string) {
    setRepsCount(prev => ({ ...prev, [exId]: 0 }))
  }

  function cycleAudio() {
    const next: AudioMode = audioMode === 'off' ? 'guide' : audioMode === 'guide' ? 'coach' : 'off'
    setAudioMode(next)
    if (next === 'off') stop()
    else speak(next === 'guide'
      ? 'Modo guiado activado.'
      : 'Modo entrenador activado. Te acompañaré.')
  }

  function playGuide(exId: string) {
    const ex = facialExercises.find(e => e.id === exId)
    if (!ex) return
    speakSequence([
      ex.nameEs,
      ex.description,
      ...ex.instructions,
      `Consejos: ${ex.tips.join('. ')}`,
    ])
  }

  const audioIcon = audioMode === 'off'
    ? <VolumeX size={18} />
    : audioMode === 'guide'
    ? <Volume2 size={18} />
    : <Mic size={18} />

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
          <div className="flex-1">
            <p className="text-xs text-zinc-500">Sección especial</p>
            <h1 className="text-white font-semibold text-sm">Ejercicios Faciales</h1>
          </div>
          {speechSupported && (
            <button
              onClick={cycleAudio}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-xs font-medium ${audioColors}`}
            >
              {audioIcon}
              <span className="hidden sm:inline">
                {audioMode === 'off' ? 'Audio off' : audioMode === 'guide' ? 'Guiado' : 'Coach'}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-32">
        {/* Intro */}
        <div className="bg-pink-500/5 border border-pink-500/20 rounded-2xl p-4 space-y-1.5">
          <p className="text-sm font-semibold text-pink-300">Reduce la papada — 8 ejercicios clave</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Estos ejercicios trabajan los músculos profundos del cuello, mandíbula y zona submentoniana.
            Realiza la rutina completa 5-6 veces por semana para ver resultados en 4-6 semanas.
            Son completamente independientes de tu programa de fitness.
          </p>
        </div>

        {/* Exercise cards */}
        {facialExercises.map((ex, idx) => {
          const done = repsCount[ex.id] ?? 0
          const target = parseTargetReps(ex.reps)
          const allDone = done >= target
          const isActive = activeHoldId === ex.id
          const isExpanded = expandedId === ex.id
          const progressPct = target > 0 ? Math.min(done / target, 1) * 100 : 0

          return (
            <div
              key={ex.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                allDone
                  ? 'border-emerald-400/30 bg-emerald-400/5'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              {/* Card header */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    allDone ? 'bg-emerald-400/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-sm ${allDone ? 'text-emerald-400' : 'text-white'}`}>
                        {ex.nameEs}
                      </p>
                      <span className="text-[10px] text-pink-400 bg-pink-400/10 px-2 py-0.5 rounded-full">
                        {ex.benefit}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{ex.reps}</p>
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                    className="p-1 text-zinc-500 hover:text-zinc-300"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Rep progress bar */}
                {target > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-zinc-500">Reps completadas</span>
                      <span className={`text-xs font-bold ${allDone ? 'text-emerald-400' : 'text-zinc-300'}`}>
                        {done} / {target}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${allDone ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Always-visible tips */}
                <div className="mt-3 space-y-1">
                  {ex.tips.map((tip, i) => (
                    <p key={i} className="text-[11px] text-amber-400/80 flex gap-1.5 items-start">
                      <span className="shrink-0">💡</span>
                      <span>{tip}</span>
                    </p>
                  ))}
                </div>
              </div>

              {/* Hold timer (active) */}
              {isActive && (
                <div className="mx-4 mb-3 p-3 bg-zinc-800 rounded-xl flex items-center gap-3">
                  <div className="relative w-14 h-14 shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" strokeWidth="4" stroke="#27272a" fill="none" />
                      <circle
                        cx="28" cy="28" r="24" strokeWidth="4"
                        stroke="#22d3ee" fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - holdTimer / holdTotal)}`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white tabular-nums">
                      {holdTimer}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Mantén la posición</p>
                    <p className="text-xs text-zinc-500">{ex.nameEs}</p>
                  </div>
                  <button onClick={skipHold} className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    <SkipForward size={18} />
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="px-4 pb-4 flex gap-2">
                {ex.holdSeconds > 0 ? (
                  <button
                    onClick={() => isActive ? skipHold() : startHold(ex.id, ex.holdSeconds)}
                    disabled={allDone}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-zinc-700 text-zinc-300'
                        : allDone
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/30'
                    }`}
                  >
                    {isActive ? 'Cancelar' : allDone ? '✓ Completado' : `Mantener ${ex.holdSeconds}s`}
                  </button>
                ) : (
                  <button
                    onClick={() => setRepsCount(prev => ({ ...prev, [ex.id]: (prev[ex.id] ?? 0) + 1 }))}
                    disabled={allDone}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      allDone
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/30'
                    }`}
                  >
                    {allDone ? '✓ Completado' : '+ Repetición'}
                  </button>
                )}
                {speechSupported && audioMode === 'guide' && (
                  <button
                    onClick={() => playGuide(ex.id)}
                    className="px-3 py-2.5 rounded-xl bg-violet-400/10 border border-violet-400/30 text-violet-400 hover:bg-violet-400/20 transition-colors"
                    title="Escuchar instrucciones"
                  >
                    <Volume2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => resetReps(ex.id)}
                  className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Reiniciar"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* Expanded instructions */}
              {isExpanded && (
                <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">{ex.description}</p>
                  <div>
                    <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-2">Cómo ejecutarlo</p>
                    <ol className="space-y-2">
                      {ex.instructions.map((ins, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-zinc-400">
                          <span className="text-cyan-400 font-bold shrink-0">{i + 1}.</span>
                          {ins}
                        </li>
                      ))}
                    </ol>
                  </div>
                  {ex.videoKeyword && (
                    <div>
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Tutorial en video</p>
                      <VideoCard keyword={ex.videoKeyword} nameEs={ex.nameEs} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Completion note */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center space-y-1">
          <p className="text-xs text-zinc-500">Tiempo estimado de rutina completa</p>
          <p className="text-lg font-bold text-white">~15 minutos</p>
          <p className="text-xs text-zinc-600">Realiza esta rutina antes o después de tu entrenamiento principal</p>
        </div>
      </div>
    </div>
  )
}
