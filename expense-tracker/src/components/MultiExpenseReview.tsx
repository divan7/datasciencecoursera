import { useState } from 'react';
import { Trash2, CheckCircle2, Save } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, Category, PaymentMethod } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS } from '../types/expense';
import type { AppSpace } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

export interface ExpenseWithSpace {
  expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;
  spaceId: string;
}

interface Props {
  items: Partial<Expense>[];
  spaces: AppSpace[];
  defaultSpaceId: string;
  currentUser: string;
  onSaveAll: (items: ExpenseWithSpace[]) => void;
  onCancel: () => void;
}

interface RowState {
  concept: string;
  amount: string;
  category: Category;
  paymentMethod: PaymentMethod;
  paidBy: string;
  date: string;
  spaceId: string;
  removed: boolean;
}

export function MultiExpenseReview({ items, spaces, defaultSpaceId, currentUser, onSaveAll, onCancel }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [rows, setRows] = useState<RowState[]>(() =>
    items.map((item) => ({
      concept:       item.concept ?? '',
      amount:        item.amount ? String(item.amount) : '',
      category:      (item.category as Category) ?? 'otro',
      paymentMethod: (item.paymentMethod as PaymentMethod) ?? 'tarjeta_debito',
      paidBy:        item.paidBy ?? currentUser,
      date:          item.date ?? today,
      spaceId:       defaultSpaceId,
      removed:       false,
    }))
  );

  const setRow = (i: number, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const activeRows = rows.filter((r) => !r.removed);
  const canSave = activeRows.length > 0 && activeRows.every((r) => r.concept.trim() && parseFloat(r.amount) > 0);

  const handleSave = () => {
    const result: ExpenseWithSpace[] = rows
      .filter((r) => !r.removed)
      .map((r) => ({
        spaceId: r.spaceId,
        expense: {
          concept:       r.concept.trim(),
          amount:        parseFloat(r.amount),
          category:      r.category,
          paymentMethod: r.paymentMethod,
          paidBy:        r.paidBy,
          date:          r.date,
          transactionType: 'gasto' as const,
          expenseType:   'variable' as const,
          currency:      'MXN',
        },
      }));
    onSaveAll(result);
  };

  const currentSpaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? id;
  const currentSpaceMembers = (id: string) => spaces.find((s) => s.id === id)?.members ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-purple-500" />
          <p className="text-sm font-bold text-gray-800">
            {activeRows.length} gasto{activeRows.length !== 1 ? 's' : ''} detectado{activeRows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <p className="text-xs text-gray-400">Revisa y asigna a la lista correcta</p>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => {
          if (row.removed) return null;
          const members = currentSpaceMembers(row.spaceId);
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <input
                  type="text"
                  value={row.concept}
                  onChange={(e) => setRow(i, { concept: e.target.value })}
                  placeholder="Concepto *"
                  className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-teal-400 pb-0.5 min-w-0"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-500">$</span>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) => setRow(i, { amount: e.target.value })}
                    placeholder="0.00"
                    className="w-20 text-sm font-bold text-right border-b border-dashed border-gray-300 focus:outline-none focus:border-teal-400 bg-transparent pb-0.5"
                  />
                </div>
                <button
                  onClick={() => setRow(i, { removed: true })}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Detail row */}
              <div className="px-3 pb-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={row.category}
                    onChange={(e) => setRow(i, { category: e.target.value as Category })}
                    className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-300 bg-white"
                  >
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v as string}</option>
                    ))}
                  </select>

                  <select
                    value={row.paymentMethod}
                    onChange={(e) => setRow(i, { paymentMethod: e.target.value as PaymentMethod })}
                    className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-300 bg-white"
                  >
                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                      <option key={k} value={k}>{v as string}</option>
                    ))}
                  </select>
                </div>

                {/* Paid by + space selector */}
                <div className="flex items-center gap-2">
                  {/* Member pills */}
                  <div className="flex gap-1 flex-wrap flex-1">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setRow(i, { paidBy: m.name })}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all ${
                          row.paidBy === m.name ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'
                        }`}
                        style={row.paidBy === m.name ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                          style={{ backgroundColor: MEMBER_COLORS[m.colorIndex], fontSize: '7px' }}
                        >
                          {m.name.slice(0, 1).toUpperCase()}
                        </span>
                        {m.name}
                      </button>
                    ))}
                  </div>

                  {/* Space selector */}
                  {spaces.length > 1 && (
                    <select
                      value={row.spaceId}
                      onChange={(e) => {
                        const newSpaceId = e.target.value;
                        const newMembers = spaces.find((s) => s.id === newSpaceId)?.members ?? [];
                        setRow(i, {
                          spaceId: newSpaceId,
                          paidBy: newMembers[0]?.name ?? currentUser,
                        });
                      }}
                      className="text-xs px-2 py-1.5 border-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-300 font-semibold flex-shrink-0"
                      style={{ borderColor: 'var(--soi-teal)', color: 'var(--soi-teal)', backgroundColor: '#f0fafa' }}
                      title="Lista de destino"
                    >
                      {spaces.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.id === defaultSpaceId ? `★ ${sp.name}` : sp.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Space label when only one space */}
                {spaces.length === 1 && (
                  <p className="text-xs text-gray-400">📂 {currentSpaceName(row.spaceId)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeRows.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Eliminaste todos los gastos</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-95"
          style={{ backgroundColor: 'var(--soi-teal)' }}
        >
          <Save size={16} />
          Guardar {activeRows.length > 1 ? `los ${activeRows.length} gastos` : 'gasto'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
