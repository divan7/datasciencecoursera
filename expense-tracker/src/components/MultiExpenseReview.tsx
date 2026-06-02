import { useState } from 'react';
import { Trash2, CheckCircle2, Save, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, Category, PaymentMethod, ExpenseType, Frequency } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS } from '../types/expense';
import type { AppSpace } from '../types/space';
import { MEMBER_COLORS } from '../types/space';
import { BillSplitter } from './BillSplitter';
import { FiscalAdvice } from './FiscalAdvice';
import type { FiscalProfile } from '../types/fiscal';
import { getActiveRegimenes } from '../types/fiscal';

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
  fiscalProfile?: FiscalProfile;
  apiKey?: string;
}

interface RowState {
  concept: string;
  amount: string;
  category: Category;
  paymentMethod: PaymentMethod;
  paidBy: string;
  date: string;
  store: string;
  spaceId: string;
  notes: string;
  showNotes: boolean;
  removed: boolean;
  expenseType: ExpenseType;
  frequency: Frequency;
}

export function MultiExpenseReview({ items, spaces, defaultSpaceId, currentUser, onSaveAll, onCancel, fiscalProfile, apiKey }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Preserve the receipt image from item[0] — it survives through the review
  const receiptImage = items[0]?.receiptImageBase64;

  const [rows, setRows] = useState<RowState[]>(() =>
    items.map((item) => ({
      concept:       item.concept ?? '',
      amount:        item.amount ? String(item.amount) : '',
      category:      (item.category as Category) ?? 'otro',
      paymentMethod: (item.paymentMethod as PaymentMethod) ?? 'tarjeta_debito',
      paidBy:        item.paidBy ?? currentUser,
      date:          item.date ?? today,
      store:         item.store ?? '',
      spaceId:       defaultSpaceId,
      notes:         item.notes ?? '',
      showNotes:     false,
      removed:       false,
      // Respect expenseType from AI (text parser may detect 'fijo'); photos always
      // arrive as 'variable' from the receipt prompt, so this is safe for both flows.
      expenseType:   ((item.expenseType as ExpenseType | undefined) ?? 'variable'),
      frequency:     (item.frequency as Frequency | undefined) ?? 'mensual',
    }))
  );

  const [ticketNotes, setTicketNotes] = useState('');
  const [showBillSplitter, setShowBillSplitter] = useState(false);
  const [invoiceDecision, setInvoiceDecision] = useState<Expense['invoiceStatus']>(undefined);

  const setRow = (i: number, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const activeRows = rows.filter((r) => !r.removed);
  const canSave = activeRows.length > 0 && activeRows.every((r) => r.concept.trim() && parseFloat(r.amount) > 0);
  const isTicket = activeRows.length > 1;

  const handleSave = () => {
    const active = rows.filter((r) => !r.removed);
    const ticketId = active.length > 1
      ? `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : undefined;

    const result: ExpenseWithSpace[] = active.map((r, idx) => ({
      spaceId: r.spaceId,
      expense: {
        concept:            r.concept.trim(),
        amount:             parseFloat(r.amount),
        category:           r.category,
        paymentMethod:      r.paymentMethod,
        paidBy:             r.paidBy,
        date:               r.date,
        store:              r.store.trim() || undefined,
        notes:              r.notes.trim() || undefined,
        ticketId,
        ticketNotes:        ticketId && ticketNotes.trim() ? ticketNotes.trim() : undefined,
        // Attach the compressed receipt image to the first saved item only
        receiptImageBase64: idx === 0 ? receiptImage : undefined,
        invoiceStatus:      invoiceDecision,
        transactionType:    'gasto' as const,
        expenseType:        r.expenseType,
        frequency:          r.expenseType === 'fijo' ? r.frequency : undefined,
        currency:           'MXN',
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

      {/* Ticket-level comment — only shown when 2+ items */}
      {isTicket && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1.5">
            <MessageSquare size={12} />
            Comentario general del ticket (opcional)
          </label>
          <textarea
            value={ticketNotes}
            onChange={(e) => setTicketNotes(e.target.value)}
            placeholder="Ej: Compra semanal de súper, incluye productos para la semana..."
            rows={2}
            className="w-full text-xs text-gray-700 bg-white border border-amber-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-gray-300"
          />
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => {
          if (row.removed) return null;
          const members = currentSpaceMembers(row.spaceId);
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-2 px-3 pt-3 pb-1">
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
                {/* Per-item notes toggle */}
                <button
                  type="button"
                  onClick={() => setRow(i, { showNotes: !row.showNotes })}
                  title="Agregar nota al artículo"
                  className={`p-1 transition-colors flex-shrink-0 ${row.showNotes || row.notes ? 'text-teal-500' : 'text-gray-300 hover:text-teal-400'}`}
                >
                  <MessageSquare size={14} />
                </button>
                <button
                  onClick={() => setRow(i, { removed: true })}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Store sub-row */}
              <div className="flex items-center gap-1 px-3 pb-1">
                <span className="text-xs text-gray-300">📍</span>
                <input
                  type="text"
                  value={row.store}
                  onChange={(e) => setRow(i, { store: e.target.value })}
                  placeholder="Establecimiento (opcional)"
                  className="flex-1 text-xs text-gray-500 bg-transparent border-none focus:outline-none placeholder-gray-300"
                />
              </div>

              {/* Space assignment — always visible */}
              <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
                <span className="text-xs text-gray-400 flex-shrink-0">📂 Lista:</span>
                {spaces.length === 1 ? (
                  <span className="text-xs font-semibold" style={{ color: 'var(--soi-teal)' }}>
                    {currentSpaceName(row.spaceId)}
                  </span>
                ) : (
                  spaces.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        const newMembers = spaces.find((s) => s.id === sp.id)?.members ?? [];
                        setRow(i, { spaceId: sp.id, paidBy: newMembers[0]?.name ?? currentUser });
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                        row.spaceId === sp.id
                          ? 'text-white border-transparent'
                          : 'border-gray-200 text-gray-500 bg-white hover:border-teal-300'
                      }`}
                      style={row.spaceId === sp.id ? { backgroundColor: 'var(--soi-teal)' } : {}}
                    >
                      {sp.id === defaultSpaceId ? `★ ${sp.name}` : sp.name}
                    </button>
                  ))
                )}
              </div>

              {/* Per-item notes row */}
              {(row.showNotes || row.notes) && (
                <div className="px-3 pb-2">
                  <textarea
                    value={row.notes}
                    onChange={(e) => setRow(i, { notes: e.target.value })}
                    placeholder="Nota para este artículo (opcional)"
                    rows={1}
                    className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-teal-300 placeholder-gray-300"
                  />
                </div>
              )}

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

                {/* Expense type toggle */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  {(['variable', 'fijo'] as ExpenseType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRow(i, { expenseType: t })}
                      className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                        row.expenseType === t
                          ? t === 'fijo' ? 'text-white' : 'bg-white text-gray-700 shadow-sm'
                          : 'text-gray-400'
                      }`}
                      style={row.expenseType === t && t === 'fijo' ? { backgroundColor: 'var(--soi-teal)' } : {}}
                    >
                      {t === 'variable' ? '💳 Variable' : '🔄 Fijo'}
                    </button>
                  ))}
                </div>

                {/* Paid by */}
                <div className="flex gap-1 flex-wrap">
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
          type="button"
          onClick={() => setShowBillSplitter(true)}
          disabled={!canSave}
          className="px-4 py-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 active:scale-95 flex-shrink-0"
          title="Dividir cuenta entre participantes"
        >
          <Users size={16} />
          Dividir
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-all"
        >
          ✕
        </button>
      </div>

      {showBillSplitter && (
        <BillSplitter
          items={activeRows.map((r) => ({ concept: r.concept, amount: parseFloat(r.amount) || 0 }))}
          members={currentSpaceMembers(activeRows[0]?.spaceId ?? defaultSpaceId)}
          onClose={() => setShowBillSplitter(false)}
        />
      )}

      {fiscalProfile && getActiveRegimenes(fiscalProfile).length > 0 && activeRows.length > 0 && (
        <FiscalAdvice
          expenses={activeRows.map((r) => ({
            concept: r.concept,
            amount: parseFloat(r.amount) || 0,
            category: r.category,
            transactionType: 'gasto' as const,
            invoiceStatus: invoiceDecision,
          }))}
          ticketImage={receiptImage}
          ticketMediaType="image/jpeg"
          profile={fiscalProfile}
          apiKey={apiKey}
          onDecide={setInvoiceDecision}
        />
      )}
    </div>
  );
}
