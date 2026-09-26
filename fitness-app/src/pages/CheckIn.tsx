import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { format } from 'date-fns'

type Form = {
  weight: string
  waist: string
  hips: string
  chest: string
  thigh: string
  energy: 1 | 2 | 3 | 4 | 5
  sleep: 1 | 2 | 3 | 4 | 5
  mood: 1 | 2 | 3 | 4 | 5
  notes: string
}

const ratingEmoji = ['', '😴', '😟', '😐', '🙂', '🔥']
const ratingLabel = {
  energy: ['', 'Sin energía', 'Poca energía', 'Normal', 'Buena energía', 'Muy activo'],
  sleep: ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'],
  mood: ['', 'Muy bajo', 'Bajo', 'Neutral', 'Bueno', 'Excelente'],
}

export default function CheckIn() {
  const { activeUser, logMetrics, getUserMetrics } = useAppStore()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<Form>({
    weight: '',
    waist: '',
    hips: '',
    chest: '',
    thigh: '',
    energy: 3,
    sleep: 3,
    mood: 3,
    notes: '',
  })

  if (!activeUser) return null

  const metrics = getUserMetrics(activeUser.id)
  const lastMetric = metrics[metrics.length - 1]

  function handleSave() {
    if (!form.weight) return
    logMetrics({
      userId: activeUser!.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: Number(form.weight),
      waist: form.waist ? Number(form.waist) : undefined,
      hips: form.hips ? Number(form.hips) : undefined,
      chest: form.chest ? Number(form.chest) : undefined,
      thigh: form.thigh ? Number(form.thigh) : undefined,
      energy: form.energy,
      sleep: form.sleep,
      mood: form.mood,
      notes: form.notes,
    })
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <CheckCircle2 size={56} className="text-emerald-400" />
        <h2 className="text-2xl font-bold text-white">¡Check-in guardado!</h2>
        <p className="text-zinc-400">Tus métricas de hoy han sido registradas.</p>
        <button
          onClick={() => setSaved(false)}
          className="mt-2 px-6 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-sm hover:border-zinc-500 transition-colors"
        >
          Nuevo check-in
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Check-in Semanal</h1>
        <p className="text-zinc-500 text-sm mt-1">{format(new Date(), "d 'de' MMMM, yyyy")}</p>
      </div>

      {/* Last metrics reference */}
      {lastMetric && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500 mb-2">Último registro: {lastMetric.date}</p>
          <div className="flex gap-4 flex-wrap">
            <span className="text-sm text-zinc-300">Peso: <strong className="text-white">{lastMetric.weight} kg</strong></span>
            {lastMetric.waist && <span className="text-sm text-zinc-300">Cintura: <strong className="text-white">{lastMetric.waist} cm</strong></span>}
            {lastMetric.hips && <span className="text-sm text-zinc-300">Cadera: <strong className="text-white">{lastMetric.hips} cm</strong></span>}
          </div>
        </div>
      )}

      {/* Measurements */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Medidas corporales</h3>

        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Peso (kg) *</label>
          <input
            type="number"
            step="0.1"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400/60"
            placeholder={lastMetric ? String(lastMetric.weight) : '80'}
            value={form.weight}
            onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([
            { key: 'waist', label: 'Cintura (cm)' },
            { key: 'hips', label: 'Cadera (cm)' },
            { key: 'chest', label: 'Pecho (cm)' },
            { key: 'thigh', label: 'Muslo (cm)' },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
              <input
                type="number"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-400/60"
                placeholder="—"
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Wellbeing */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Bienestar esta semana</h3>

        {([
          { key: 'energy' as const, label: 'Nivel de energía' },
          { key: 'sleep' as const, label: 'Calidad del sueño' },
          { key: 'mood' as const, label: 'Estado de ánimo' },
        ]).map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-zinc-400">{label}</label>
              <span className="text-sm text-zinc-300">{ratingEmoji[form[key]]} {ratingLabel[key][form[key]]}</span>
            </div>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, [key]: n }))}
                  className={`flex-1 h-10 rounded-lg border-2 text-lg transition-all ${
                    form[key] === n
                      ? 'border-cyan-400 bg-cyan-400/10'
                      : 'border-zinc-700 bg-zinc-800'
                  }`}
                >
                  {ratingEmoji[n]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <label className="text-sm font-semibold text-zinc-300 block mb-3">Notas adicionales</label>
        <textarea
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400/60 resize-none"
          placeholder="¿Cómo fue la semana? ¿Alguna molestia? ¿Qué mejoró?"
          value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!form.weight}
        className="w-full py-4 bg-cyan-400 text-zinc-950 font-bold rounded-2xl hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Guardar check-in
      </button>
    </div>
  )
}
