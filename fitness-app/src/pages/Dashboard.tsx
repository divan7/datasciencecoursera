import { useNavigate } from 'react-router-dom'
import { Flame, Trophy, Calendar, ChevronRight, Play, CheckCircle2, AlertCircle, Star } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { muscleFocusGroups, priorityConfig } from '../data/muscleFocus'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { MuscleFocusId } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    activeUser,
    activeProgram,
    getTodayWorkoutLog,
    getTotalWorkoutsCompleted,
    getCurrentStreak,
    getWeekCompletionRate,
  } = useAppStore()

  if (!activeUser || !activeProgram) return null

  const currentPhase = activeProgram.phases[activeProgram.currentPhaseIndex]
  const todayLog = getTodayWorkoutLog(activeUser.id)
  const totalDone = getTotalWorkoutsCompleted(activeUser.id)
  const streak = getCurrentStreak(activeUser.id)
  const weekRate = getWeekCompletionRate(activeUser.id, currentPhase.id, activeProgram.currentWeek)

  const startDate = parseISO(activeProgram.startDate)
  const totalDays = Math.floor((Date.now() - startDate.getTime()) / 86400000)

  // Determine today's workout
  const dayOfWeek = format(new Date(), 'EEE', { locale: es })
  const dayMap: Record<string, string> = {
    lun: 'Lun', mar: 'Mar', mié: 'Mie', jue: 'Jue', vie: 'Vie', sáb: 'Sab', dom: 'Dom',
  }
  const todayKey = dayMap[dayOfWeek.toLowerCase()] ?? ''
  const todayWorkoutLabel = currentPhase.weekSchedule[todayKey] ?? 'Descanso'
  const todayWorkout = currentPhase.workouts.find(w => w.dayLabel === todayWorkoutLabel)

  const isRestDay = !todayWorkout
  const isCompleted = !!todayLog?.completed

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-zinc-400 text-sm">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Hola, {activeUser.name} 👋</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Flame size={18} className="text-orange-400" />}
          label="Racha"
          value={`${streak} días`}
          color="orange"
        />
        <StatCard
          icon={<Trophy size={18} className="text-violet-400" />}
          label="Completados"
          value={`${totalDone}`}
          color="violet"
        />
        <StatCard
          icon={<Calendar size={18} className="text-cyan-400" />}
          label="Día"
          value={`${totalDays + 1}`}
          color="cyan"
        />
      </div>

      {/* Current Phase Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
              Fase {currentPhase.id} de {activeProgram.phases.length}
            </span>
            <h2 className="text-white font-semibold mt-0.5">{currentPhase.name}</h2>
          </div>
          <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-1 rounded-full">
            Semana {activeProgram.currentWeek}/{currentPhase.durationWeeks}
          </span>
        </div>
        <p className="text-zinc-500 text-sm mb-4">{currentPhase.description}</p>

        {/* Week progress */}
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
            <span>Progreso esta semana</span>
            <span>{Math.round(weekRate * 100)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${weekRate * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => navigate('/program')}
          className="mt-4 flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Ver programa completo <ChevronRight size={14} />
        </button>
      </div>

      {/* Today's Workout */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Entrenamiento de hoy
        </h2>

        {isRestDay ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl">😴</div>
            <div>
              <p className="text-white font-semibold">Día de descanso</p>
              <p className="text-zinc-500 text-sm mt-0.5">El descanso es parte del entrenamiento</p>
            </div>
          </div>
        ) : isCompleted ? (
          <div className="bg-emerald-400/5 border border-emerald-400/30 rounded-2xl p-5 flex items-center gap-4">
            <CheckCircle2 size={40} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-300 font-semibold">¡Entrenamiento completado! 🎉</p>
              <p className="text-zinc-500 text-sm mt-0.5">{todayWorkout?.name}</p>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs text-violet-400 font-semibold">{todayWorkout?.focus}</span>
                <h3 className="text-white font-semibold mt-0.5">{todayWorkout?.name}</h3>
              </div>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
                ~{todayWorkout?.estimatedMinutes} min
              </span>
            </div>
            <p className="text-zinc-500 text-sm mb-4">
              {todayWorkout?.exercises.length} ejercicios • {currentPhase.location.includes('home') ? '🏠 En casa' : '🏋️ Gimnasio'}
            </p>
            <button
              onClick={() => navigate(`/workout/${todayWorkout?.id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-400 text-zinc-950 font-bold rounded-xl hover:bg-cyan-300 transition-colors"
            >
              <Play size={18} fill="currentColor" />
              Iniciar entrenamiento
            </button>
          </div>
        )}
      </div>

      {/* Advancement check */}
      {weekRate >= 1 && (
        <div className="bg-violet-400/5 border border-violet-400/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-violet-300 font-semibold">¡Semana completa!</p>
              <p className="text-zinc-400 text-sm mt-1">
                Completaste todas las sesiones. Revisa si cumples los criterios de avance en la pantalla del Programa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Muscle priorities summary */}
      {activeUser.musclePriorities && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-cyan-400" />
            <p className="text-sm font-semibold text-zinc-300">Enfoque muscular</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {muscleFocusGroups.map(group => {
              const priority = activeUser.musclePriorities[group.id as MuscleFocusId] ?? 'medium'
              if (priority === 'maintenance') return null
              const cfg = priorityConfig[priority]
              return (
                <span
                  key={group.id}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}
                >
                  {group.emoji} {group.label}
                  {priority === 'high' && <Star size={9} fill="currentColor" />}
                </span>
              )
            })}
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Editar prioridades →
          </button>
        </div>
      )}

      {/* Weekly check-in prompt */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">Check-in semanal</p>
          <p className="text-zinc-500 text-sm mt-0.5">Registra tu peso y métricas de progreso</p>
        </div>
        <button
          onClick={() => navigate('/checkin')}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-sm hover:border-zinc-500 transition-colors"
        >
          Ir <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'orange' | 'violet' | 'cyan'
}) {
  const colors = {
    orange: 'bg-orange-400/10 border-orange-400/20',
    violet: 'bg-violet-400/10 border-violet-400/20',
    cyan: 'bg-cyan-400/10 border-cyan-400/20',
  }
  return (
    <div className={`${colors[color]} border rounded-xl p-3`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}</div>
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}
