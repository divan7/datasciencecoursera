import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, Download } from 'lucide-react';
import type { Expense, Category } from '../types/expense';
import { CATEGORIES } from '../types/expense';
import type { SpaceMember } from '../types/space';

interface MonthlyReportProps {
  expenses: Expense[];
  members: SpaceMember[];
}

export function MonthlyReport({ expenses, members }: MonthlyReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map((e) => e.date.slice(0, 7)));
    const current = format(new Date(), 'yyyy-MM');
    months.add(current);
    return Array.from(months).sort().reverse();
  }, [expenses]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );

  const stats = useMemo(() => {
    const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const fixed = monthExpenses.filter((e) => e.expenseType === 'fijo').reduce((s, e) => s + e.amount, 0);
    const variable = monthExpenses.filter((e) => e.expenseType === 'variable').reduce((s, e) => s + e.amount, 0);

    // Per-member totals
    const byMember = members.reduce((acc, m) => {
      acc[m.name] = monthExpenses.filter((e) => e.paidBy === m.name).reduce((s, e) => s + e.amount, 0);
      return acc;
    }, {} as Record<string, number>);

    // By category
    const byCat: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    });
    const categories = Object.entries(byCat)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => ({ cat: cat as Category, amount, pct: total > 0 ? (amount / total) * 100 : 0 }));

    // By payment method
    const byMethod: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      byMethod[e.paymentMethod] = (byMethod[e.paymentMethod] || 0) + e.amount;
    });

    return { total, byMember, fixed, variable, categories, byMethod, count: monthExpenses.length };
  }, [monthExpenses, members]);

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return format(date, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
  }, [selectedMonth]);

  const exportCSV = () => {
    const headers = [
      'Fecha', 'Concepto', 'Monto', 'Categoría', 'Quién pagó', 'Forma de pago',
      'Tarjeta', 'Banco', 'Establecimiento', 'Tipo', 'Frecuencia', 'MSI',
      'Reembolsable', 'Deducible', 'Factura', 'Compartido', 'Notas'
    ];
    const rows = monthExpenses.map((e) => [
      e.date, e.concept, e.amount, CATEGORIES[e.category],
      e.paidBy,
      e.paymentMethod, e.cardLast4 || '', e.bank || '', e.store || '',
      e.expenseType, e.frequency || '', e.installments || '',
      e.isReimbursable ? 'Sí' : 'No',
      e.isTaxDeductible ? 'Sí' : 'No',
      e.invoiceRequested ? 'Sí' : 'No',
      e.sharedExpense ? 'Sí' : 'No',
      e.notes || ''
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastos_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500'];

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none bg-white"
          >
            {availableMonths.map((m) => {
              const [y, mo] = m.split('-');
              const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
              return (
                <option key={m} value={m}>
                  {format(date, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              );
            })}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={exportCSV}
          disabled={monthExpenses.length === 0}
          className="px-3 py-2 border border-gray-200 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-40"
          title="Exportar CSV"
        >
          <Download size={18} />
        </button>
      </div>

      {monthExpenses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📊</p>
          <p className="font-medium">Sin gastos en {monthLabel}</p>
        </div>
      ) : (
        <>
          {/* Main totals */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
            <p className="text-blue-200 text-sm mb-1">{monthLabel}</p>
            <p className="text-4xl font-bold">
              ${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-blue-200 text-sm mt-1">{stats.count} gastos registrados</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {members.map((m) => {
                const amt = stats.byMember[m.name] ?? 0;
                return (
                  <div key={m.id} className="bg-white/10 rounded-xl p-3">
                    <p className="text-blue-200 text-xs truncate">{m.name}</p>
                    <p className="text-white font-bold text-lg">
                      ${amt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </p>
                    <p className="text-blue-300 text-xs">
                      {stats.total > 0 ? Math.round((amt / stats.total) * 100) : 0}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fixed vs Variable */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Fijos vs Variables</h3>
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-400 mb-1">Gastos fijos</p>
                <p className="font-bold text-gray-900">${stats.fixed.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-400">{stats.total > 0 ? Math.round((stats.fixed / stats.total) * 100) : 0}%</p>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-400 mb-1">Gastos variables</p>
                <p className="font-bold text-gray-900">${stats.variable.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-400">{stats.total > 0 ? Math.round((stats.variable / stats.total) * 100) : 0}%</p>
              </div>
            </div>
            {/* Progress bar */}
            {stats.total > 0 && (
              <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(stats.fixed / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Por categoría</h3>
            <div className="space-y-2">
              {stats.categories.map(({ cat, amount, pct }, i) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{CATEGORIES[cat]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
                      <span className="text-xs font-bold text-gray-800">
                        ${amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top expenses */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Top 5 gastos del mes</h3>
            <div className="space-y-2">
              {[...monthExpenses]
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{CATEGORIES[e.category]?.split(' ')[0]}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{e.concept}</p>
                        <p className="text-xs text-gray-400">
                          {e.paidBy} · {e.date.slice(8)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">
                      ${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
