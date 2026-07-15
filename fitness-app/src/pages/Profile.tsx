import { useState } from 'react'
import { User, Plus, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { programPhases } from '../data/programs'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const fitnessLabels: Record<number, string> = {
  1: 'Sedentario', 2: 'Leve', 3: 'Moderado', 4: 'Activo', 5: 'Muy activo',
}

export default function Profile() {
  const { activeUser, activeProgram, state, setActiveUser } = useAppStore()
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [saved] = useState(false)

  if (!activeUser) return null

  const currentPhase = activeProgram ? programPhases[activeProgram.currentPhaseIndex] : null
  const startDate = activeProgram ? parseISO(activeProgram.startDate) : null
  const daysSinceStart = startDate
    ? Math.floor((Date.now() - startDate.getTime()) / 86400000)
    : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>

      {/* User card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            <User size={28} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{activeUser.name}</h2>
            <p className="text-zinc-500 text-sm">{activeUser.age} años · {activeUser.gender === 'male' ? 'Hombre' : activeUser.gender === 'female' ? 'Mujer' : 'Otro'}</p>
            {startDate && (
              <p className="text-xs text-zinc-600 mt-0.5">
                Día {daysSinceStart + 1} · Inicio: {format(startDate, "d 'de' MMMM", { locale: es })}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Peso" value={`${activeUser.weight} kg`} />
          <InfoItem label="Altura" value={`${activeUser.height} cm`} />
          <InfoItem label="Condición" value={fitnessLabels[activeUser.fitnessLevel]} />
          <InfoItem label="Tiempo/sesión" value={`${activeUser.availableTime} min`} />
        </div>
      </div>

      {/* Current phase */}
      {currentPhase && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Programa actual</p>
          <p className="text-white font-semibold">{currentPhase.name}</p>
          <p className="text-zinc-500 text-sm mt-1">
            Semana {activeProgram?.currentWeek}/{currentPhase.durationWeeks} · {currentPhase.targetMinutes[0]}-{currentPhase.targetMinutes[1]} min/sesión
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {currentPhase.location.map(loc => (
              <span key={loc} className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full">
                {loc === 'home' ? '🏠 Casa' : '🏋️ Gimnasio'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Goals & injuries */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Objetivos</p>
          <div className="flex flex-wrap gap-2">
            {activeUser.goals.map(g => (
              <span key={g} className="text-sm text-violet-300 bg-violet-400/10 px-3 py-1 rounded-full">{g}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Deporte meta</p>
          <span className="text-sm text-cyan-300 bg-cyan-400/10 px-3 py-1 rounded-full">{activeUser.targetSport}</span>
        </div>
        {activeUser.injuries.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Lesiones/molestias</p>
            <div className="flex flex-wrap gap-2">
              {activeUser.injuries.map(inj => (
                <span key={inj} className="text-sm text-orange-300 bg-orange-400/10 px-3 py-1 rounded-full">{inj}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Fuentes científicas del programa</p>
        <div className="space-y-2">
          {[
            { name: 'Squat University', author: 'Dr. Aaron Horschig', focus: 'Biomecánica, salud articular' },
            { name: 'Powerexplosif', author: 'David Marchante', focus: 'Fuerza con base científica' },
            { name: 'Athlean-X', author: 'Jeff Cavaliere', focus: 'Prevención de lesiones' },
            { name: 'Renaissance Periodization', author: 'Dr. Mike Israetel', focus: 'Hipertrofia, periodización' },
            { name: 'Jeremy Ethier', author: 'Jeremy Ethier', focus: 'Optimización con evidencia' },
            { name: 'Fisioterapia a tu alcance', author: 'Jordi Reig', focus: 'Rehabilitación y bajo impacto' },
          ].map(s => (
            <div key={s.name} className="flex items-start gap-3 py-2 border-b border-zinc-800/60 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{s.name}</p>
                <p className="text-xs text-zinc-500">{s.author} · {s.focus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-user */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-300">Usuarios</p>
          <button
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showSwitcher ? 'Cerrar' : 'Cambiar'}
          </button>
        </div>

        {showSwitcher && (
          <div className="space-y-2 mb-3">
            {state.users.map(u => (
              <button
                key={u.id}
                onClick={() => { setActiveUser(u.id); setShowSwitcher(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                  u.id === activeUser.id
                    ? 'border-cyan-400/40 bg-cyan-400/5'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                  <User size={14} className="text-zinc-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm text-white">{u.name}</p>
                  <p className="text-xs text-zinc-500">{u.age} años · {fitnessLabels[u.fitnessLevel]}</p>
                </div>
                {u.id === activeUser.id && <Check size={14} className="text-cyan-400" />}
              </button>
            ))}
          </div>
        )}

        <a
          href="/setup"
          onClick={e => {
            e.preventDefault()
            // Force clear activeUserId temporarily to show setup
            // by navigating to setup route via window
            window.location.href = '/setup'
          }}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Plus size={14} />
          Añadir nuevo usuario
        </a>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <Check size={14} />
          Cambios guardados
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm text-white font-semibold mt-0.5">{value}</p>
    </div>
  )
}
