import { useState, useEffect, useMemo } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Expense } from '../types/expense';
import { CATEGORIES } from '../types/expense';
import type { AppSpace } from '../types/space';
import { loadExpenses } from '../utils/storage';
import { expensesDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';

interface ExportDialogProps {
  spaces: AppSpace[];
  currentSpaceId: string;
  currentExpenses: Expense[];
  onClose: () => void;
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return format(new Date(parseInt(y), parseInt(mo) - 1, 1), 'MMMM yyyy', { locale: es })
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function ExportDialog({ spaces, currentSpaceId, currentExpenses, onClose }: ExportDialogProps) {
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<Set<string>>(new Set([currentSpaceId]));
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({ [currentSpaceId]: currentExpenses });
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');

  // Load expenses for every space on mount (from localStorage first, then Supabase)
  useEffect(() => {
    if (spaces.length <= 1) return;
    const load = async () => {
      setLoadingSpaces(true);
      const result: Record<string, Expense[]> = { [currentSpaceId]: currentExpenses };
      for (const space of spaces) {
        if (space.id === currentSpaceId) continue;
        result[space.id] = loadExpenses(space.id);
        if (isSupabaseConfigured) {
          try {
            const remote = await expensesDb.list(space.id);
            if (remote.length > 0) result[space.id] = remote;
          } catch { /* keep local */ }
        }
      }
      setAllExpenses(result);
      setLoadingSpaces(false);
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // All months across all spaces combined
  const allAvailableMonths = useMemo(() => {
    const months = new Set<string>();
    Object.values(allExpenses).flat().forEach((e) => months.add(e.date.slice(0, 7)));
    months.add(format(new Date(), 'yyyy-MM'));
    return [...months].sort().reverse();
  }, [allExpenses]);

  // Initialise from/to once months are known
  useEffect(() => {
    if (allAvailableMonths.length === 0) return;
    setToMonth((prev) => prev || allAvailableMonths[0]);
    setFromMonth((prev) => prev || allAvailableMonths[allAvailableMonths.length - 1]);
  }, [allAvailableMonths]);

  const toggleSpace = (spaceId: string) => {
    setSelectedSpaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId) && next.size > 1) next.delete(spaceId);
      else next.add(spaceId);
      return next;
    });
  };

  const effectiveFrom = fromMonth <= toMonth ? fromMonth : toMonth;
  const effectiveTo   = fromMonth <= toMonth ? toMonth  : fromMonth;

  const exportedCount = useMemo(() => {
    if (!effectiveFrom || !effectiveTo) return 0;
    let n = 0;
    for (const id of selectedSpaceIds) {
      n += (allExpenses[id] ?? []).filter((e) => {
        const m = e.date.slice(0, 7);
        return m >= effectiveFrom && m <= effectiveTo;
      }).length;
    }
    return n;
  }, [selectedSpaceIds, allExpenses, effectiveFrom, effectiveTo]);

  const handleExport = () => {
    if (!effectiveFrom || !effectiveTo || exportedCount === 0) return;
    const rows: (Expense & { spaceName: string })[] = [];
    for (const id of selectedSpaceIds) {
      const spaceName = spaces.find((s) => s.id === id)?.name ?? id;
      (allExpenses[id] ?? [])
        .filter((e) => { const m = e.date.slice(0, 7); return m >= effectiveFrom && m <= effectiveTo; })
        .forEach((e) => rows.push({ ...e, spaceName }));
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));

    const headers = [
      'Lista', 'Fecha', 'Tipo', 'Concepto', 'Monto', 'Categoría',
      'Quién pagó', 'Forma de pago', 'Tarjeta', 'Banco', 'Establecimiento',
      'Tipo gasto', 'Frecuencia', 'MSI', 'Reembolsable', 'Deducible',
      'Factura', 'Compartido', 'Notas',
    ];
    const data = rows.map((e) => [
      e.spaceName, e.date, e.transactionType, e.concept, e.amount,
      CATEGORIES[e.category] ?? e.category, e.paidBy, e.paymentMethod,
      e.cardLast4 ?? '', e.bank ?? '', e.store ?? '',
      e.expenseType, e.frequency ?? '', e.installments ?? '',
      e.isReimbursable ? 'Sí' : 'No', e.isTaxDeductible ? 'Sí' : 'No',
      e.invoiceRequested ? 'Sí' : 'No', e.sharedExpense ? 'Sí' : 'No',
      e.notes ?? '',
    ]);
    const csv = [headers, ...data].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = effectiveFrom === effectiveTo
      ? `gastos_${effectiveFrom}.csv`
      : `gastos_${effectiveFrom}_${effectiveTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-teal-600" />
            <h2 className="text-base font-bold text-gray-900">Exportar gastos</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Space selection (only when multiple spaces exist) */}
          {spaces.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Listas a incluir</p>
              <div className="space-y-2">
                {spaces.map((space) => (
                  <label key={space.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedSpaceIds.has(space.id)}
                      onChange={() => toggleSpace(space.id)}
                      className="w-4 h-4 accent-teal-600"
                    />
                    <span className="text-sm font-medium text-gray-700 flex-1">
                      {space.id === currentSpaceId ? `★ ${space.name}` : space.name}
                    </span>
                    {loadingSpaces && space.id !== currentSpaceId
                      ? <Loader2 size={12} className="text-gray-400 animate-spin" />
                      : <span className="text-xs text-gray-400">{(allExpenses[space.id] ?? []).length} registros</span>
                    }
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Período</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Desde</label>
                <select
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-300 bg-white"
                >
                  {allAvailableMonths.map((m) => (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hasta</label>
                <select
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-300 bg-white"
                >
                  {allAvailableMonths.map((m) => (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-teal-50 rounded-xl px-4 py-3">
            <p className="text-sm text-teal-800">
              <span className="font-bold">{exportedCount}</span> registro{exportedCount !== 1 ? 's' : ''} a exportar
            </p>
            {effectiveFrom && effectiveTo && effectiveFrom !== effectiveTo && (
              <p className="text-xs text-teal-600 mt-0.5">
                {monthLabel(effectiveFrom)} — {monthLabel(effectiveTo)}
              </p>
            )}
            {effectiveFrom && effectiveTo && effectiveFrom === effectiveTo && (
              <p className="text-xs text-teal-600 mt-0.5">{monthLabel(effectiveFrom)}</p>
            )}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exportedCount === 0}
            className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
            style={{ backgroundColor: 'var(--soi-teal)' }}
          >
            <Download size={16} />
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
