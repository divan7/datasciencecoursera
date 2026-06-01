import { useState, useMemo } from 'react';
import { Receipt, CheckCircle, Clock, XCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Expense } from '../types/expense';
import type { FiscalProfile } from '../types/fiscal';
import { REGIMENES_FISCALES } from '../types/fiscal';
import { summarizeDeductions, checkDeductibility } from '../utils/fiscalRules';

interface Props {
  expenses: Expense[];
  profile: FiscalProfile;
  onUpdateExpense: (id: string, data: Partial<Expense>) => void;
}

const MONTHS_LABELS = (month: string) => {
  const [y, m] = month.split('-');
  return format(new Date(parseInt(y), parseInt(m) - 1, 1), 'MMMM yyyy', { locale: es })
    .replace(/^\w/, (c) => c.toUpperCase());
};

type FilterTab = 'pending' | 'invoiced' | 'all';

export function FiscalSummary({ expenses, profile, onUpdateExpense }: Props) {
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  const yearExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(String(year)) && e.transactionType !== 'ingreso'),
    [expenses, year]
  );

  const summary = useMemo(() => summarizeDeductions(yearExpenses, profile), [yearExpenses, profile]);

  // Group deductibles by month
  const byMonth = useMemo(() => {
    const map: Record<string, typeof summary.details> = {};
    summary.details
      .filter((d) => d.isDeductible)
      .forEach((d) => {
        const m = d.expense.date.slice(0, 7);
        (map[m] ??= []).push(d);
      });
    return map;
  }, [summary]);

  const filteredByMonth = useMemo(() => {
    const map: Record<string, typeof summary.details> = {};
    for (const [month, items] of Object.entries(byMonth)) {
      const filtered = items.filter((d) => {
        const s = d.expense.invoiceStatus;
        if (filter === 'pending') return !s || s === 'pending';
        if (filter === 'invoiced') return s === 'invoiced';
        return true;
      });
      if (filtered.length > 0) map[month] = filtered;
    }
    return map;
  }, [byMonth, filter]);

  const pendingTotal = summary.details
    .filter((d) => d.isDeductible && (!d.expense.invoiceStatus || d.expense.invoiceStatus === 'pending'))
    .reduce((s, d) => s + d.expense.amount, 0);

  const invoicedTotal = summary.details
    .filter((d) => d.isDeductible && d.expense.invoiceStatus === 'invoiced')
    .reduce((s, d) => s + d.expense.amount, 0);

  const fmt$ = (v: number) =>
    v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  if (!profile.regimenFiscal) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
        <Receipt size={24} className="mx-auto text-amber-500" />
        <p className="text-sm font-semibold text-amber-800">Configura tu perfil fiscal</p>
        <p className="text-xs text-amber-600">
          Para ver el resumen de deducciones, agrega tu régimen fiscal en Configuración → Perfil fiscal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt size={17} className="text-teal-600" />
          <h3 className="text-sm font-bold text-gray-800">Resumen fiscal</h3>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-300"
        >
          {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Regime badge */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
        <p className="text-xs text-teal-700">
          Régimen: <span className="font-semibold">{profile.regimenFiscal} — {REGIMENES_FISCALES[profile.regimenFiscal]}</span>
        </p>
        {profile.rfc && <p className="text-xs text-teal-600">RFC: <span className="font-mono">{profile.rfc}</span></p>}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
          <TrendingUp size={14} className="mx-auto text-teal-500 mb-1" />
          <p className="text-xs text-gray-400 leading-tight">Potencial</p>
          <p className="text-sm font-bold text-teal-800">{fmt$(summary.totalPotential)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
          <Clock size={14} className="mx-auto text-amber-500 mb-1" />
          <p className="text-xs text-gray-400 leading-tight">Pendiente</p>
          <p className="text-sm font-bold text-amber-700">{fmt$(pendingTotal)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
          <CheckCircle size={14} className="mx-auto text-green-500 mb-1" />
          <p className="text-xs text-gray-400 leading-tight">Facturado</p>
          <p className="text-sm font-bold text-green-700">{fmt$(invoicedTotal)}</p>
        </div>
      </div>

      {/* By CFDI use */}
      {Object.keys(summary.byUse).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500">Por tipo de deducción:</p>
          {Object.entries(summary.byUse).map(([use, { label, total, count }]) => (
            <div key={use} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs font-bold text-teal-700 w-8 flex-shrink-0">{use}</span>
              <span className="text-xs text-gray-600 flex-1 truncate">{label}</span>
              <span className="text-xs text-gray-400">{count}</span>
              <span className="text-xs font-semibold text-gray-700 flex-shrink-0">{fmt$(total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          { key: 'pending', label: '⏳ Pendientes' },
          { key: 'invoiced', label: '✅ Facturados' },
          { key: 'all', label: 'Todos' },
        ] as { key: FilterTab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Expense list grouped by month */}
      {Object.keys(filteredByMonth).length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          {filter === 'pending' ? 'Sin gastos facturables pendientes' : 'Sin registros'}
        </p>
      ) : (
        <div className="space-y-2">
          {Object.entries(filteredByMonth)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, items]) => {
              const monthTotal = items.reduce((s, d) => s + d.expense.amount, 0);
              const isOpen = expandedMonth === month;
              return (
                <div key={month} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedMonth(isOpen ? null : month)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100"
                  >
                    <span className="text-xs font-semibold text-gray-700">{MONTHS_LABELS(month)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{items.length} gasto{items.length !== 1 ? 's' : ''}</span>
                      <span className="text-xs font-bold text-gray-700">{fmt$(monthTotal)}</span>
                      {isOpen ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="divide-y divide-gray-100">
                      {items.map(({ expense, suggestedCfdiUse }) => {
                        const st = expense.invoiceStatus;
                        const { isDeductible } = checkDeductibility(expense, profile);
                        return (
                          <div key={expense.id} className="flex items-center gap-2 px-3 py-2.5">
                            {st === 'invoiced'
                              ? <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                              : st === 'skipped'
                              ? <XCircle size={13} className="text-gray-300 flex-shrink-0" />
                              : <Clock size={13} className="text-amber-500 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 truncate">{expense.concept}</p>
                              <p className="text-[10px] text-gray-400">
                                {expense.date}
                                {isDeductible && suggestedCfdiUse && ` · CFDI ${suggestedCfdiUse}`}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-gray-700 flex-shrink-0">
                              {fmt$(expense.amount)}
                            </span>
                            {/* Quick action */}
                            {(!st || st === 'pending') && (
                              <button
                                onClick={() => onUpdateExpense(expense.id, { invoiceStatus: 'invoiced' })}
                                className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 font-semibold flex-shrink-0"
                              >
                                ✅
                              </button>
                            )}
                            {st === 'invoiced' && (
                              <button
                                onClick={() => onUpdateExpense(expense.id, { invoiceStatus: 'pending' })}
                                className="text-[10px] px-2 py-1 rounded-lg bg-gray-50 text-gray-500 border border-gray-200 flex-shrink-0"
                              >
                                ↩
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {yearExpenses.length > 0 && summary.deductibleCount === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          Ningún gasto registrado es deducible en el régimen {profile.regimenFiscal}.
        </p>
      )}
    </div>
  );
}
