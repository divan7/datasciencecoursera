import { useState } from 'react';
import { Droplets, Scale, Activity, Clock, ChevronRight } from 'lucide-react';
import { calculateDailyGoalMl } from '../utils/formula';
import type { ActivityLevel } from '../types';

const ACTIVITIES: { value: ActivityLevel; label: string; desc: string; emoji: string }[] = [
  { value: 'sedentary', label: 'Sedentario', desc: 'Sin ejercicio regular',         emoji: '🪑' },
  { value: 'light',     label: 'Ligero',     desc: 'Caminar, 1-2x por semana',      emoji: '🚶' },
  { value: 'moderate',  label: 'Moderado',   desc: 'Ejercicio 3-4x por semana',     emoji: '🏃' },
  { value: 'active',    label: 'Activo',     desc: 'Entrenamiento intenso 5+x/sem', emoji: '💪' },
];

interface ProfileData {
  weight_kg: number;
  activity_level: ActivityLevel;
  wake_time: string;
  sleep_time: string;
  glass_size_ml: number;
}

interface Props {
  onSave: (data: ProfileData) => void;
  loading?: boolean;
  isEditing?: boolean;
  initialData?: ProfileData;
}

export function Setup({ onSave, loading, isEditing, initialData }: Props) {
  const [weight, setWeight]       = useState(initialData ? String(initialData.weight_kg) : '');
  const [unit, setUnit]           = useState<'kg' | 'lbs'>('kg');
  const [activity, setActivity]   = useState<ActivityLevel>(initialData?.activity_level ?? 'sedentary');
  const [wakeTime, setWakeTime]   = useState(initialData?.wake_time   ?? '06:00');
  const [sleepTime, setSleepTime] = useState(initialData?.sleep_time  ?? '22:00');
  const [glassSize, setGlassSize] = useState(String(initialData?.glass_size_ml ?? 250));
  const [error, setError]         = useState('');

  const weightNum = parseFloat(weight);
  const weightKg  = weightNum ? (unit === 'lbs' ? weightNum * 0.453592 : weightNum) : 0;
  const preview   = weightKg > 0 ? calculateDailyGoalMl(weightKg, activity) : 0;
  const glasses   = preview ? Math.ceil(preview / parseInt(glassSize || '250')) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weightNum || weightNum < 20 || weightNum > 500) {
      setError('Ingresa un peso válido');
      return;
    }
    onSave({
      weight_kg:     Math.round(weightKg * 10) / 10,
      activity_level: activity,
      wake_time:     wakeTime,
      sleep_time:    sleepTime,
      glass_size_ml: parseInt(glassSize || '250', 10),
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm pb-8">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500/20 rounded-2xl border border-sky-400/30 mb-3 shadow-lg shadow-sky-500/20">
            <Droplets size={28} className="text-sky-400" />
          </div>
          <h1 className="text-2xl font-black text-white">
            {isEditing ? 'Editar perfil' : 'Configura tu perfil'}
          </h1>
          <p className="text-sky-300/50 text-xs mt-1">
            Basado en ciencia de la hidratación
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Weight */}
          <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
            <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold uppercase tracking-wide mb-3">
              <Scale size={14} />
              Peso corporal
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                step="0.1"
                className="flex-1 bg-white/10 border border-white/20 focus:border-sky-400 rounded-xl px-4 py-3 text-white text-xl font-bold placeholder-white/25 focus:outline-none transition-colors"
              />
              <div className="flex bg-white/8 border border-white/15 rounded-xl overflow-hidden">
                {(['kg', 'lbs'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${
                      unit === u ? 'bg-sky-500 text-white' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
            <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold uppercase tracking-wide mb-3">
              <Activity size={14} />
              Nivel de actividad
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setActivity(a.value)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    activity === a.value
                      ? 'bg-sky-500/25 border-sky-400/60 shadow-sm shadow-sky-500/20'
                      : 'bg-white/5 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="text-xl mb-1">{a.emoji}</div>
                  <div className={`text-sm font-semibold ${activity === a.value ? 'text-white' : 'text-white/80'}`}>
                    {a.label}
                  </div>
                  <div className="text-xs text-white/40 leading-snug">{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
            <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold uppercase tracking-wide mb-3">
              <Clock size={14} />
              Horario del día
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Me despierto</label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 focus:border-sky-400 rounded-xl px-3 py-2.5 text-white focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Me duermo</label>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 focus:border-sky-400 rounded-xl px-3 py-2.5 text-white focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-white/40 mb-1.5 block">Tamaño del vaso (ml)</label>
              <div className="flex gap-2">
                {[150, 200, 250, 300].map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => setGlassSize(String(ml))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      glassSize === String(ml)
                        ? 'bg-sky-500/25 border-sky-400/60 text-white'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
                    }`}
                  >
                    {ml}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          {preview > 0 && (
            <div className="bg-sky-500/20 rounded-2xl p-4 border border-sky-400/30 text-center">
              <p className="text-sky-300 text-sm">Tu meta diaria recomendada</p>
              <p className="text-white text-4xl font-black mt-1">
                {preview.toLocaleString('es')} ml
              </p>
              <p className="text-sky-300/70 text-sm mt-1">
                {glasses} vasos de {glassSize} ml
              </p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-sky-500/30"
          >
            {loading ? 'Guardando…' : isEditing ? 'Guardar cambios' : '¡Empezar!'}
            {!loading && <ChevronRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
