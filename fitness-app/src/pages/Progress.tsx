import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type Tab = 'body' | 'workouts' | 'wellbeing'

const tabLabels: Record<Tab, string> = {
  body: 'Cuerpo',
  workouts: 'Entrenamientos',
  wellbeing: 'Bienestar',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

export default function Progress() {
  const { activeUser, getUserMetrics, getUserWorkoutLogs } = useAppStore()
  const [tab, setTab] = useState<Tab>('body')

  if (!activeUser) return null

  const metrics = getUserMetrics(activeUser.id)
  const logs = getUserWorkoutLogs(activeUser.id).filter(l => l.completed)

  const bodyData = metrics.map(m => ({
    date: format(parseISO(m.date), 'd MMM', { locale: es }),
    Peso: m.weight,
    Cintura: m.waist ?? null,
    Cadera: m.hips ?? null,
    Muslo: m.thigh ?? null,
  }))

  const wellbeingData = metrics.map(m => ({
    date: format(parseISO(m.date), 'd MMM', { locale: es }),
    Energía: m.energy,
    Sueño: m.sleep,
    Ánimo: m.mood,
  }))

  // Group logs by week
  const weeklyData: Record<string, number> = {}
  logs.forEach(l => {
    const week = `Sem ${l.week} F${l.phaseId}`
    weeklyData[week] = (weeklyData[week] ?? 0) + 1
  })
  const workoutData = Object.entries(weeklyData).map(([week, count]) => ({
    week,
    Sesiones: count,
  }))

  const weightChange = metrics.length >= 2
    ? (metrics[metrics.length - 1].weight - metrics[0].weight).toFixed(1)
    : null
  const totalWorkouts = logs.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Progreso</h1>
        <p className="text-zinc-500 text-sm mt-1">Visualiza tu evolución</p>
      </div>

      {/* Summary stats */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{metrics[metrics.length - 1].weight}</p>
            <p className="text-xs text-zinc-500 mt-0.5">kg actuales</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${weightChange && Number(weightChange) < 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              {weightChange ? (Number(weightChange) > 0 ? `+${weightChange}` : weightChange) : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">kg cambio</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-cyan-400">{totalWorkouts}</p>
            <p className="text-xs text-zinc-500 mt-0.5">entrenos</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {(Object.keys(tabLabels) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Charts */}
      {tab === 'body' && (
        <div className="space-y-4">
          {bodyData.length < 2 ? (
            <EmptyChart message="Necesitas al menos 2 check-ins para ver la gráfica de peso" />
          ) : (
            <>
              <ChartCard title="Peso corporal (kg)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={bodyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Peso" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {bodyData.some(d => d.Cintura !== null) && (
                <ChartCard title="Medidas (cm)">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={bodyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                      {['Cintura', 'Cadera', 'Muslo'].map((key, i) => (
                        bodyData.some((d: any) => d[key] !== null) && (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={['#a78bfa', '#fb923c', '#34d399'][i]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        )
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'workouts' && (
        <div className="space-y-4">
          {workoutData.length < 2 ? (
            <EmptyChart message="Completa más entrenamientos para ver tus estadísticas semanales" />
          ) : (
            <ChartCard title="Sesiones completadas por semana">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={workoutData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Sesiones" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {logs.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-semibold text-zinc-300">Últimos entrenamientos</p>
              </div>
              {logs.slice(-10).reverse().map(log => (
                <div key={log.id} className="px-4 py-3 border-b border-zinc-800/50 last:border-0 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{log.date}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{log.durationMinutes} min · Fase {log.phaseId} · Sem {log.week}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg">{['😴', '😐', '🙂', '😄', '🔥'][log.overallFeel - 1]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'wellbeing' && (
        <div className="space-y-4">
          {wellbeingData.length < 2 ? (
            <EmptyChart message="Necesitas al menos 2 check-ins para ver tus métricas de bienestar" />
          ) : (
            <ChartCard title="Energía, Sueño y Ánimo (1-5)">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={wellbeingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                  <Line type="monotone" dataKey="Energía" stroke="#fb923c" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Sueño" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Ánimo" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <p className="text-sm font-semibold text-zinc-300 mb-4">{title}</p>
      {children}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
      <p className="text-4xl mb-3">📊</p>
      <p className="text-zinc-400 text-sm">{message}</p>
    </div>
  )
}
