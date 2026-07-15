import { useState } from 'react'
import { Dumbbell, ChevronRight, ChevronLeft, User, Target, Activity } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import type { Gender, FitnessLevel, Equipment } from '../types'

type FormData = {
  name: string
  age: string
  weight: string
  height: string
  gender: Gender
  injuries: string[]
  fitnessLevel: FitnessLevel
  goals: string[]
  targetSport: string
  equipment: Equipment[]
  availableTime: string
}

const injuryOptions = [
  'Rodilla derecha', 'Rodilla izquierda', 'Espalda baja', 'Hombro', 'Cadera', 'Tobillo', 'Ninguna',
]

const goalOptions = [
  'Volver a correr', 'Perder peso', 'Ganar masa muscular', 'Mejorar resistencia',
  'Reducir dolor articular', 'Mejorar postura', 'Salud general',
]

const fitnessLabels: Record<FitnessLevel, string> = {
  1: 'Sedentario — nula o casi nula actividad física',
  2: 'Leve — caminatas ocasionales, actividad esporádica',
  3: 'Moderado — ejercicio 1-2 veces/semana',
  4: 'Activo — ejercicio 3-4 veces/semana',
  5: 'Muy activo — entrenamiento diario',
}

const steps = [
  { title: 'Datos personales', icon: User },
  { title: 'Historial físico', icon: Activity },
  { title: 'Tus metas', icon: Target },
]

export default function Setup() {
  const { createUser } = useAppStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({
    name: '',
    age: '48',
    weight: '',
    height: '',
    gender: 'male',
    injuries: ['Rodilla derecha', 'Rodilla izquierda'],
    fitnessLevel: 1,
    goals: ['Volver a correr'],
    targetSport: 'Running',
    equipment: ['home'],
    availableTime: '25',
  })

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  function handleSubmit() {
    createUser({
      name: form.name || 'Usuario',
      age: Number(form.age) || 48,
      weight: Number(form.weight) || 80,
      height: Number(form.height) || 175,
      gender: form.gender,
      injuries: form.injuries.filter(i => i !== 'Ninguna'),
      fitnessLevel: form.fitnessLevel,
      goals: form.goals,
      targetSport: form.targetSport,
      equipment: form.equipment,
      availableTime: Number(form.availableTime) || 25,
    })
  }

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0
    if (step === 1) return true
    return form.goals.length > 0
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
          <Dumbbell size={24} className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">FitProgress</h1>
          <p className="text-zinc-500 text-sm">Acondicionamiento Físico</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                  i === step
                    ? 'bg-cyan-400 border-cyan-400 text-zinc-950'
                    : i < step
                    ? 'bg-cyan-400/20 border-cyan-400/40 text-cyan-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}
              >
                {i < step ? '✓' : <Icon size={14} />}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-10 h-px ${i < step ? 'bg-cyan-400/40' : 'bg-zinc-700'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">{steps[step].title}</h2>

        {/* STEP 0 */}
        {step === 0 && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Nombre</label>
              <input
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400/60"
                placeholder="¿Cómo te llamamos?"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider">Edad</label>
                <input
                  type="number"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400/60"
                  value={form.age}
                  onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider">Género</label>
                <select
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400/60"
                  value={form.gender}
                  onChange={e => setForm(p => ({ ...p, gender: e.target.value as Gender }))}
                >
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider">Peso (kg)</label>
                <input
                  type="number"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400/60"
                  placeholder="80"
                  value={form.weight}
                  onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider">Altura (cm)</label>
                <input
                  type="number"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400/60"
                  placeholder="175"
                  value={form.height}
                  onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-5 mt-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Lesiones o molestias previas
              </label>
              <div className="flex flex-wrap gap-2">
                {injuryOptions.map(inj => (
                  <button
                    key={inj}
                    type="button"
                    onClick={() =>
                      setForm(p => ({
                        ...p,
                        injuries: toggle(p.injuries, inj),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.injuries.includes(inj)
                        ? 'bg-orange-400/20 border-orange-400/60 text-orange-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {inj}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Nivel de condición física actual
              </label>
              <div className="space-y-2">
                {([1, 2, 3, 4, 5] as FitnessLevel[]).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, fitnessLevel: lvl }))}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      form.fitnessLevel === lvl
                        ? 'bg-cyan-400/10 border-cyan-400/60 text-cyan-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <span className="font-semibold mr-2">{lvl}</span>
                    <span className="text-sm">{fitnessLabels[lvl]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Tiempo disponible por sesión (minutos)
              </label>
              <input
                type="number"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400/60"
                value={form.availableTime}
                min={15}
                max={90}
                onChange={e => setForm(p => ({ ...p, availableTime: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-5 mt-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Deporte o actividad meta
              </label>
              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400/60"
                placeholder="Ej: Running, Ciclismo, Natación..."
                value={form.targetSport}
                onChange={e => setForm(p => ({ ...p, targetSport: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Mis objetivos principales
              </label>
              <div className="flex flex-wrap gap-2">
                {goalOptions.map(goal => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, goals: toggle(p.goals, goal) }))}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.goals.includes(goal)
                        ? 'bg-violet-400/20 border-violet-400/60 text-violet-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Equipamiento disponible
              </label>
              <div className="flex gap-3">
                {(['home', 'gym'] as Equipment[]).map(eq => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, equipment: toggle(p.equipment, eq) }))}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.equipment.includes(eq)
                        ? 'bg-cyan-400/10 border-cyan-400/60 text-cyan-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {eq === 'home' ? '🏠 En casa' : '🏋️ Gimnasio'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
            >
              <ChevronLeft size={16} />
              Atrás
            </button>
          )}
          <button
            type="button"
            disabled={!canNext()}
            onClick={() => {
              if (step < steps.length - 1) setStep(s => s + 1)
              else handleSubmit()
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyan-400 text-zinc-950 font-semibold hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step < steps.length - 1 ? (
              <>Continuar <ChevronRight size={16} /></>
            ) : (
              <>Comenzar mi programa <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>

      <p className="mt-6 text-zinc-600 text-xs text-center max-w-sm">
        Basado en principios de Squat University, Powerexplosif, Athlean-X, Renaissance Periodization, Jeremy Ethier y Fisioterapia a tu alcance
      </p>
    </div>
  )
}
