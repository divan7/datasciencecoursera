import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Expense } from '../types/expense';
import { CATEGORIES, INCOME_CATEGORIES } from '../types/expense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

interface DashboardProps {
  expenses: Expense[];
  members: SpaceMember[];
}

const PIE_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1',
  '#14b8a6','#eab308','#e11d48','#7c3aed','#0284c7',
];

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const fmtFull = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Range = '3m' | '6m' | '12m';

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`${color} rounded-2xl p-3 flex flex-col gap-0.5`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg rounded-xl p-3 border border-gray-100 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtFull(p.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg rounded-xl p-3 border border-gray-100 text-xs">
      <p className="font-bold text-gray-700">{payload[0].name}</p>
      <p className="text-gray-600">{fmtFull(payload[0].value)}</p>
    </div>
  );
}

export function Dashboard({ expenses, members }: DashboardProps) {
  const [range, setRange] = useState<Range>('6m');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // --- Data preparation ---

  // Generate last N months list
  const months = useMemo(() => {
    const n = range === '3m' ? 3 : range === '6m' ? 6 : 12;
    return Array.from({ length: n }, (_, i) => {
      const d = subMonths(new Date(), n - 1 - i);
      return format(d, 'yyyy-MM');
    });
  }, [range]);

  const availableMonths = useMemo(() => {
    const set = new Set(expenses.map((e) => e.date.slice(0, 7)));
    set.add(format(new Date(), 'yyyy-MM'));
    return Array.from(set).sort().reverse();
  }, [expenses]);

  // Monthly income vs expense trend
  const trendData = useMemo(() => {
    return months.map((m) => {
      const mes = expenses.filter((e) => e.date.startsWith(m));
      const gastos = mes.filter((e) => (e.transactionType ?? 'gasto') === 'gasto').reduce((s, e) => s + e.amount, 0);
      const ingresos = mes.filter((e) => e.transactionType === 'ingreso').reduce((s, e) => s + e.amount, 0);
      const balance = ingresos - gastos;
      const [y, mo] = m.split('-');
      const label = format(new Date(parseInt(y), parseInt(mo) - 1, 1), 'MMM yy', { locale: es });
      return { mes: label, Gastos: Math.round(gastos), Ingresos: Math.round(ingresos), Balance: Math.round(balance) };
    });
  }, [expenses, months]);

  // Current month selected summary
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );

  const monthlySummary = useMemo(() => {
    const gastos = monthExpenses.filter((e) => (e.transactionType ?? 'gasto') === 'gasto').reduce((s, e) => s + e.amount, 0);
    const ingresos = monthExpenses.filter((e) => e.transactionType === 'ingreso').reduce((s, e) => s + e.amount, 0);
    // Per-member amounts
    const byMember = members.reduce((acc, m) => {
      acc[m.name] = monthExpenses.filter((e) => (e.transactionType ?? 'gasto') === 'gasto' && e.paidBy === m.name).reduce((s, e) => s + e.amount, 0);
      return acc;
    }, {} as Record<string, number>);
    return { gastos, ingresos, balance: ingresos - gastos, byMember };
  }, [monthExpenses, members]);

  // Category breakdown (expenses only)
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.filter((e) => (e.transactionType ?? 'gasto') === 'gasto').forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([cat, amount]) => ({
        name: (CATEGORIES[cat as keyof typeof CATEGORIES] ?? cat).replace(/^[^ ]+ /, ''),
        value: Math.round(amount),
      }));
  }, [monthExpenses]);

  // Income category breakdown
  const incomeCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.filter((e) => e.transactionType === 'ingreso').forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => ({
        name: (INCOME_CATEGORIES[cat] ?? cat).replace(/^[^ ]+ /, ''),
        value: Math.round(amount),
      }));
  }, [monthExpenses]);

  // Per-user per-month stacked bar
  const userTrendData = useMemo(() => {
    return months.map((m) => {
      const mes = expenses.filter((e) => e.date.startsWith(m) && (e.transactionType ?? 'gasto') === 'gasto');
      const [y, mo] = m.split('-');
      const label = format(new Date(parseInt(y), parseInt(mo) - 1, 1), 'MMM yy', { locale: es });
      const entry: Record<string, string | number> = { mes: label };
      members.forEach((member) => {
        entry[member.name] = Math.round(mes.filter((e) => e.paidBy === member.name).reduce((s, e) => s + e.amount, 0));
      });
      return entry;
    });
  }, [expenses, months, members]);

  // Top concepts (expense)
  const topConcepts = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.filter((e) => (e.transactionType ?? 'gasto') === 'gasto').forEach((e) => {
      map[e.concept] = (map[e.concept] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([concept, amount]) => ({ concept, amount: Math.round(amount) }));
  }, [monthExpenses]);

  // Balance area chart over months
  const balanceData = useMemo(() => {
    let acum = 0;
    return months.map((m) => {
      const mes = expenses.filter((e) => e.date.startsWith(m));
      const gastos = mes.filter((e) => (e.transactionType ?? 'gasto') === 'gasto').reduce((s, e) => s + e.amount, 0);
      const ingresos = mes.filter((e) => e.transactionType === 'ingreso').reduce((s, e) => s + e.amount, 0);
      acum += ingresos - gastos;
      const [y, mo] = m.split('-');
      const label = format(new Date(parseInt(y), parseInt(mo) - 1, 1), 'MMM yy', { locale: es });
      return { mes: label, Balance: Math.round(acum) };
    });
  }, [expenses, months]);

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return format(new Date(parseInt(y), parseInt(m) - 1, 1), 'MMMM yyyy', { locale: es })
      .replace(/^\w/, (c) => c.toUpperCase());
  }, [selectedMonth]);

  const isEmpty = expenses.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-5xl mb-3">📊</p>
        <p className="font-semibold text-gray-600">Aún no hay datos</p>
        <p className="text-sm mt-1">Registra gastos e ingresos para ver el dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Month + Range selectors */}
      <div className="flex gap-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          {availableMonths.map((m) => {
            const [y, mo] = m.split('-');
            const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
            return (
              <option key={m} value={m}>
                {format(d, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            );
          })}
        </select>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(['3m', '6m', '12m'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                range === r ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <SummaryCard
          label={`💸 Gastos ${monthLabel.split(' ')[0]}`}
          value={fmt(monthlySummary.gastos)}
          color="bg-red-50 text-red-700"
        />
        <SummaryCard
          label={`💰 Ingresos ${monthLabel.split(' ')[0]}`}
          value={fmt(monthlySummary.ingresos)}
          color="bg-green-50 text-green-700"
        />
        <SummaryCard
          label="⚖️ Balance mensual"
          value={fmt(Math.abs(monthlySummary.balance))}
          sub={monthlySummary.balance >= 0 ? '▲ superávit' : '▼ déficit'}
          color={monthlySummary.balance >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
        />
        <SummaryCard
          label="📅 Gastos este año"
          value={fmt(expenses.filter((e) => (e.transactionType ?? 'gasto') === 'gasto' && e.date.startsWith(format(new Date(), 'yyyy'))).reduce((s, e) => s + e.amount, 0))}
          color="bg-purple-50 text-purple-700"
        />
      </div>

      {/* Income vs Expense trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">💸 Ingresos vs Gastos ({range})</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Balance acumulado */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">📈 Balance acumulado ({range})</h3>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={balanceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Balance" stroke="#3b82f6" strokeWidth={2} fill="url(#balGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category pie */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">🗂️ Gastos por categoría — {monthLabel}</h3>
          <div className="flex gap-3 items-center">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                  dataKey="value" paddingAngle={2}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 min-w-0">
              {categoryData.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-gray-600 flex-1 truncate">{d.name}</span>
                  <span className="text-xs font-bold text-gray-800 flex-shrink-0">{fmt(d.value)}</span>
                </div>
              ))}
              {categoryData.length > 6 && (
                <p className="text-xs text-gray-400">+{categoryData.length - 6} más</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Income category pie */}
      {incomeCategoryData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">💰 Ingresos por fuente — {monthLabel}</h3>
          <div className="flex gap-3 items-center">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={incomeCategoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={68}
                  dataKey="value" paddingAngle={2}>
                  {incomeCategoryData.map((_, i) => (
                    <Cell key={i} fill={['#10b981','#3b82f6','#8b5cf6','#f59e0b','#06b6d4','#84cc16'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 min-w-0">
              {incomeCategoryData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#06b6d4','#84cc16'][i % 6] }} />
                  <span className="text-xs text-gray-600 flex-1 truncate">{d.name}</span>
                  <span className="text-xs font-bold text-gray-800 flex-shrink-0">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Per-user stacked bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">👤 Gastos por persona ({range})</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={userTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {members.map((m, i) => (
              <Bar
                key={m.id}
                dataKey={m.name}
                stackId="a"
                fill={MEMBER_COLORS[m.colorIndex]}
                radius={i === members.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className={`grid gap-2 mt-3`} style={{ gridTemplateColumns: `repeat(${Math.min(members.length, 4)}, 1fr)` }}>
          {members.map((m) => {
            const amount = monthlySummary.byMember[m.name] ?? 0;
            return (
              <div key={m.id} className="rounded-xl p-2 text-center" style={{ backgroundColor: MEMBER_COLORS[m.colorIndex] + '20' }}>
                <p className="text-xs truncate" style={{ color: MEMBER_COLORS[m.colorIndex] }}>{m.name}</p>
                <p className="font-bold text-sm" style={{ color: MEMBER_COLORS[m.colorIndex] }}>{fmt(amount)}</p>
                <p className="text-xs" style={{ color: MEMBER_COLORS[m.colorIndex] }}>
                  {monthlySummary.gastos > 0 ? Math.round((amount / monthlySummary.gastos) * 100) : 0}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top concepts horizontal bar */}
      {topConcepts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">🏆 Top conceptos — {monthLabel}</h3>
          <ResponsiveContainer width="100%" height={topConcepts.length * 32 + 10}>
            <BarChart layout="vertical" data={topConcepts} margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="concept" width={100} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => fmtFull(v as number)} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {topConcepts.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Line chart: daily spend for selected month */}
      {monthExpenses.length > 0 && (() => {
        const days: Record<string, number> = {};
        monthExpenses.filter((e) => (e.transactionType ?? 'gasto') === 'gasto').forEach((e) => {
          days[e.date] = (days[e.date] || 0) + e.amount;
        });
        const dailyData = Object.entries(days).sort().map(([date, amount]) => ({
          dia: format(parseISO(date), 'd', { locale: es }),
          Gasto: Math.round(amount),
        }));
        if (dailyData.length < 2) return null;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">📅 Gasto diario — {monthLabel}</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => fmtFull(v as number)} labelFormatter={(l) => `Día ${l}`} />
                <Line type="monotone" dataKey="Gasto" stroke="#f97316" strokeWidth={2}
                  dot={{ fill: '#f97316', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
    </div>
  );
}
