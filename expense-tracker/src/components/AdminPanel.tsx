import { useState, useEffect } from 'react';
import { Users, Crown, TrendingUp, Clock, Shield } from 'lucide-react';
import { profilesDb, type Profile } from '../lib/db';

const PLAN_LABELS: Record<string, string> = {
  free:    '🆓 Free',
  trial:   '🔑 Trial',
  premium: '👑 Premium',
};

const PLAN_COLORS: Record<string, string> = {
  free:    'bg-gray-100 text-gray-600',
  trial:   'bg-amber-50 text-amber-700',
  premium: 'bg-teal-50 text-teal-700',
};

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

export function AdminPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'all' | 'free' | 'trial' | 'premium'>('all');

  useEffect(() => {
    profilesDb.listAll()
      .then(setProfiles)
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const total   = profiles.length;
  const byPlan  = { free: 0, trial: 0, premium: 0 };
  const now     = Date.now();
  let active7   = 0;
  let newThisMonth = 0;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

  for (const p of profiles) {
    byPlan[p.plan as keyof typeof byPlan] = (byPlan[p.plan as keyof typeof byPlan] ?? 0) + 1;
    if (now - new Date(p.lastSeenAt).getTime() < 7 * 86400000) active7++;
    if (new Date(p.createdAt) >= monthStart) newThisMonth++;
  }

  const filtered = filter === 'all' ? profiles : profiles.filter((p) => p.plan === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield size={18} style={{ color: '#0c6878' }} />
        <h2 className="text-base font-bold text-gray-800">Panel de Administración</h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users size={16}/>} label="Total usuarios" value={total} color="#0c6878"/>
        <StatCard icon={<TrendingUp size={16}/>} label="Activos (7 días)" value={active7} color="#10b981"/>
        <StatCard icon={<Crown size={16}/>} label="Premium" value={byPlan.premium} color="#cc7a55"/>
        <StatCard icon={<Clock size={16}/>} label="Nuevos este mes" value={newThisMonth} color="#8b5cf6"/>
      </div>

      {/* Plan breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Por plan</p>
        <div className="space-y-2">
          {(['free','trial','premium'] as const).map((plan) => (
            <div key={plan} className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]}
              </span>
              <div className="flex items-center gap-2 flex-1 mx-3">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{
                    width: total ? `${(byPlan[plan] / total) * 100}%` : '0%',
                    backgroundColor: plan === 'premium' ? '#cc7a55' : plan === 'trial' ? '#f59e0b' : '#9ca3af',
                  }}/>
                </div>
              </div>
              <span className="text-sm font-bold text-gray-700 w-6 text-right">{byPlan[plan]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuarios</p>
          <div className="flex gap-1">
            {(['all','free','trial','premium'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                  filter === f ? 'text-white' : 'text-gray-400 bg-gray-50'
                }`}
                style={filter === f ? { backgroundColor: '#0c6878' } : {}}>
                {f === 'all' ? 'Todos' : PLAN_LABELS[f].split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin usuarios</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: '#0c6878' }}>
                  {p.displayName.slice(0,1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.displayName}</p>
                  <p className="text-xs text-gray-400 truncate">{p.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${PLAN_COLORS[p.plan]}`}>
                    {PLAN_LABELS[p.plan]}
                  </span>
                  <span className="text-xs text-gray-400">{daysAgo(p.lastSeenAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
      <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
        {icon}
        <p className="text-xs font-semibold text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
    </div>
  );
}
