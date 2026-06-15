import { useState, useMemo } from 'react';
import { Trash2, CheckCircle2, Save, MessageSquare, Users, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, Category, PaymentMethod, ExpenseType, Frequency, ObligationEntry } from '../types/expense';

type DateStatus = 'today' | 'same_month_past' | 'conflict';

function classifyDate(itemDate: string, today: string): DateStatus {
  if (!itemDate || itemDate === today) return 'today';
  if (itemDate > today) return 'conflict'; // future date
  return itemDate.slice(0, 7) === today.slice(0, 7) ? 'same_month_past' : 'conflict';
}

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_ES[parseInt(m)-1]} ${y}`;
}

type SplitMode = 'equal' | 'percent' | 'amount';
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
  ticketDate: string;
  dateStatus: DateStatus;
  store: string;
  spaceId: string;
  notes: string;
  showNotes: boolean;
  removed: boolean;
  expenseType: ExpenseType;
  frequency: Frequency;
  transactionType: 'gasto' | 'ingreso';
  obligations?: ObligationEntry[];
}

export function MultiExpenseReview({ items, spaces, defaultSpaceId, currentUser, onSaveAll, onCancel, fiscalProfile, apiKey }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Preserve the receipt image from item[0] — it survives through the review
  const receiptImage = items[0]?.receiptImageBase64;

  const [rows, setRows] = useState<RowState[]>(() =>
    items.map((item) => {
      const aiDate = item.date ?? today;
      const ds = classifyDate(aiDate, today);
      return {
        concept:         item.concept ?? '',
        amount:          item.amount ? String(item.amount) : '',
        category:        (item.category as Category) ?? 'otro',
        paymentMethod:   (item.paymentMethod as PaymentMethod) ?? 'tarjeta_debito',
        paidBy:          item.paidBy ?? currentUser,
        date:            aiDate,
        ticketDate:      aiDate,
        dateStatus:      ds,
        store:           item.store ?? '',
        spaceId:         defaultSpaceId,
        notes:           item.notes ?? '',
        showNotes:       false,
        removed:         false,
        expenseType:     ((item.expenseType as ExpenseType | undefined) ?? 'variable'),
        frequency:       (item.frequency as Frequency | undefined) ?? 'mensual',
        transactionType: (item.transactionType as 'gasto' | 'ingreso' | undefined) ?? 'gasto',
      };
    })
  );

  const [ticketNotes, setTicketNotes] = useState('');
  const [showBillSplitter, setShowBillSplitter] = useState(false);
  const [showSingleSplit, setShowSingleSplit] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [splitParticipants, setSplitParticipants] = useState<string[]>([]);
  const [splitShares, setSplitShares] = useState<Record<string, number>>({});
  const [customSplitName, setCustomSplitName] = useState('');
  const [invoiceDecision, setInvoiceDecision] = useState<Expense['invoiceStatus']>(undefined);
  const [showGlobalSplitPanel, setShowGlobalSplitPanel] = useState(false);
  const [globalSplitScope, setGlobalSplitScope] = useState<'all' | 'perItem' | 'allExcept' | null>(null);
  const [exceptRowIndices, setExceptRowIndices] = useState<Set<number>>(new Set());

  const setRow = (i: number, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const currentSpaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? id;
  const currentSpaceMembers = (id: string) => spaces.find((s) => s.id === id)?.members ?? [];

  const activeRows = rows.filter((r) => !r.removed);
  const conflictRows = activeRows.filter((r) => r.dateStatus === 'conflict');
  const hasConflicts = conflictRows.length > 0;
  const canSave = activeRows.length > 0 && activeRows.every((r) => r.concept.trim() && parseFloat(r.amount) > 0) && !hasConflicts;
  const isTicket = activeRows.length > 1;

  const resolveConflicts = (useTicket: boolean) =>
    setRows((prev) => prev.map((r) =>
      r.removed || r.dateStatus !== 'conflict'
        ? r
        : { ...r, date: useTicket ? r.ticketDate : today, dateStatus: 'today' as DateStatus }
    ));

  // ── Single-expense split helpers ──────────────────────────────────────
  const splitTotal = parseFloat(activeRows[0]?.amount ?? '0') || 0;
  const nPeople = splitParticipants.length + 1;
  const splitMembers = useMemo(() => currentSpaceMembers(activeRows[0]?.spaceId ?? defaultSpaceId), [activeRows, defaultSpaceId]);
  const splitPayer = activeRows[0]?.paidBy ?? currentUser;

  const participantAmount = useMemo(() => (name: string) => {
    if (splitMode === 'equal') return splitTotal / nPeople;
    if (splitMode === 'percent') return splitTotal * (splitShares[name] ?? 0) / 100;
    return splitShares[name] ?? 0;
  }, [splitTotal, splitMode, splitParticipants, splitShares, nPeople]);

  const payerAmount = useMemo(() => {
    if (splitMode === 'equal') return splitTotal / nPeople;
    const othersSum = splitParticipants.reduce((s, n) => s + participantAmount(n), 0);
    return splitTotal - othersSum;
  }, [splitTotal, splitMode, splitParticipants, splitShares, nPeople]);

  const payerPercent = useMemo(() => {
    if (splitMode !== 'percent') return 0;
    const othersSum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
    return 100 - othersSum;
  }, [splitMode, splitParticipants, splitShares]);

  const sharesValid = useMemo(() => {
    if (!splitTotal || splitMode === 'equal') return true;
    if (splitMode === 'percent') {
      const total = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
      return total <= 100;
    }
    const total = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
    return total <= splitTotal;
  }, [splitTotal, splitMode, splitParticipants, splitShares]);

  const memberColorOf = (name: string) => {
    const m = splitMembers.find((mb) => mb.name === name);
    return MEMBER_COLORS[m?.colorIndex ?? 0];
  };
  const fmt$ = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const removeParticipant = (name: string) => {
    setSplitParticipants((p) => p.filter((x) => x !== name));
    setSplitShares((s) => { const c = { ...s }; delete c[name]; return c; });
  };
  const updateShare = (name: string, val: string) =>
    setSplitShares((s) => ({ ...s, [name]: parseFloat(val) || 0 }));

  const buildSingleObligations = (): ObligationEntry[] | undefined => {
    if (!splitTotal || splitParticipants.length === 0 || !sharesValid) return undefined;
    const userPct = splitMode === 'percent' ? payerPercent : undefined;
    return [
      { name: splitPayer, amount: payerAmount, ...(userPct !== undefined ? { percent: userPct } : {}) },
      ...splitParticipants.map((name) => ({
        name,
        amount: participantAmount(name),
        ...(splitMode === 'percent' ? { percent: splitShares[name] ?? 0 } : {}),
      })),
    ];
  };

  // Global split: build obligations for a given amount using current split config
  const buildObligationsForAmount = (amount: number, payer: string): ObligationEntry[] => {
    if (splitParticipants.length === 0 || amount <= 0) return [];
    if (splitMode === 'equal') {
      const n = splitParticipants.length + 1;
      const share = amount / n;
      return [
        { name: payer, amount: share },
        ...splitParticipants.map((name) => ({ name, amount: share })),
      ];
    }
    if (splitMode === 'percent') {
      const othersSum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
      const payerPct = Math.max(0, 100 - othersSum);
      return [
        { name: payer, amount: amount * payerPct / 100, percent: payerPct },
        ...splitParticipants.map((name) => ({
          name,
          amount: amount * (splitShares[name] ?? 0) / 100,
          percent: splitShares[name] ?? 0,
        })),
      ];
    }
    return [];
  };

  const applyGlobalSplit = () => {
    setRows((prev) =>
      prev.map((r, rawIdx) => {
        if (r.removed) return r;
        if (globalSplitScope === 'allExcept' && exceptRowIndices.has(rawIdx)) return r;
        const obs = buildObligationsForAmount(parseFloat(r.amount) || 0, r.paidBy);
        return obs.length > 0 ? { ...r, obligations: obs } : r;
      })
    );
    setShowGlobalSplitPanel(false);
    setGlobalSplitScope(null);
    setExceptRowIndices(new Set());
  };

  // Called by BillSplitter "Aplicar" — writes per-item obligations to each row
  const handleApplySplit = (itemObligations: ObligationEntry[][]) => {
    let activeIdx = 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.removed) return r;
        const obs = itemObligations[activeIdx++];
        return { ...r, obligations: obs && obs.length > 0 ? obs : undefined };
      })
    );
  };

  // Called by BillSplitter "Prorratear" — expands each row into N rows (one per member)
  const handleApplyProrate = (itemObligations: ObligationEntry[][]) => {
    const newRows: RowState[] = [];
    let activeIdx = 0;
    for (const row of rows) {
      if (row.removed) { newRows.push(row); continue; }
      const obs = itemObligations[activeIdx++];
      if (!obs || obs.length === 0) { newRows.push(row); continue; }
      for (const ob of obs) {
        newRows.push({
          ...row,
          paidBy: ob.name,
          amount: String(ob.amount),
          obligations: undefined,
        });
      }
    }
    setRows(newRows);
  };

  const handleSave = () => {
    const active = rows.filter((r) => !r.removed);
    const ticketId = active.length > 1
      ? `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : undefined;

    const singleSplitObs = !isTicket && showSingleSplit && sharesValid
      ? buildSingleObligations()
      : undefined;

    const result: ExpenseWithSpace[] = active.map((r, idx) => {
      const obs = ticketId ? r.obligations : (singleSplitObs ?? r.obligations);
      return {
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
          receiptImageBase64: idx === 0 ? receiptImage : undefined,
          invoiceStatus:      invoiceDecision,
          transactionType:    r.transactionType,
          expenseType:        r.expenseType,
          frequency:          r.expenseType === 'fijo' ? r.frequency : undefined,
          currency:           'MXN',
          obligations:        obs,
          sharedExpense:      !!obs,
        },
      };
    });
    onSaveAll(result);
  };

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

      {/* Date conflict banner — shown when AI detected an out-of-month date */}
      {hasConflicts && (() => {
        const uniqueDates = [...new Set(conflictRows.map((r) => r.ticketDate))];
        const singleDate = uniqueDates.length === 1;
        return (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <CalendarDays size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Fecha fuera del mes actual</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {singleDate
                    ? `La IA detectó la fecha ${fmtDate(uniqueDates[0])}, que no pertenece al mes actual.`
                    : `La IA detectó fechas de meses diferentes al actual.`}
                  {' '}¿Cómo deseas registrar?
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => resolveConflicts(true)}
                className="flex-1 py-2 px-3 bg-white border-2 border-amber-300 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-50 transition-all"
              >
                Usar fecha del ticket{singleDate ? ` (${fmtDate(uniqueDates[0])})` : ''}
              </button>
              <button
                type="button"
                onClick={() => resolveConflicts(false)}
                className="flex-1 py-2 px-3 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all"
              >
                Usar fecha de hoy
              </button>
            </div>
          </div>
        );
      })()}

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

              {/* Date row — always visible, clearly labeled as AI-detected */}
              <div className="flex items-center gap-2 px-3 pb-1 flex-wrap">
                <CalendarDays size={12} className={
                  row.dateStatus === 'conflict' ? 'text-amber-400' :
                  row.dateStatus === 'same_month_past' ? 'text-sky-500' :
                  'text-purple-400'
                } />
                <span className={`text-xs font-semibold flex-shrink-0 ${
                  row.dateStatus === 'conflict' ? 'text-amber-600' :
                  row.dateStatus === 'same_month_past' ? 'text-sky-600' :
                  'text-purple-600'
                }`}>Fecha detectada:</span>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => setRow(i, { date: e.target.value, dateStatus: 'today' })}
                  className={`text-xs font-bold rounded-lg px-2 py-0.5 border focus:outline-none focus:ring-1 ${
                    row.dateStatus === 'conflict'
                      ? 'text-amber-700 bg-amber-50 border-amber-300 focus:ring-amber-300'
                      : row.dateStatus === 'same_month_past'
                      ? 'text-sky-700 bg-sky-50 border-sky-200 focus:ring-sky-300'
                      : 'text-purple-700 bg-purple-50 border-purple-200 focus:ring-purple-300'
                  }`}
                />
                {row.dateStatus === 'same_month_past' && (
                  <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-200 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                    · Registrado hoy
                  </span>
                )}
                {row.dateStatus === 'conflict' && (
                  <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                    ⚠ Mes diferente
                  </span>
                )}
                {row.dateStatus === 'today' && (
                  <span className="text-[10px] text-gray-400 flex-shrink-0">· registrado hoy</span>
                )}
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

                {/* Obligations badge — set by BillSplitter */}
                {row.obligations && row.obligations.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-purple-500 font-semibold">÷ corresponde:</span>
                    {row.obligations.map((o, oi) => (
                      <span key={oi} className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {o.name} ${o.amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </span>
                    ))}
                  </div>
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
          {hasConflicts
            ? 'Define la fecha primero'
            : `Guardar ${activeRows.length > 1 ? `los ${activeRows.length} gastos` : 'gasto'}`}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isTicket) { setShowSingleSplit((v) => !v); return; }
            if (activeRows.length > 5) {
              setShowGlobalSplitPanel((v) => { if (v) setGlobalSplitScope(null); return !v; });
            } else {
              setShowBillSplitter(true);
            }
          }}
          disabled={!canSave}
          className={`px-4 py-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 active:scale-95 flex-shrink-0 ${
            (!isTicket && showSingleSplit) || (isTicket && showGlobalSplitPanel)
              ? 'bg-purple-200 border-purple-400 text-purple-900'
              : 'bg-purple-50 border-purple-200 text-purple-700'
          }`}
          title="Dividir entre participantes"
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

      {/* ── Global split panel (> 5 items) ── */}
      {showGlobalSplitPanel && isTicket && activeRows.length > 5 && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-purple-100 bg-purple-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-purple-800">Dividir {activeRows.length} gastos</p>
              <p className="text-xs text-purple-500 mt-0.5">Elige el alcance de la división</p>
            </div>
            <button type="button" onClick={() => { setShowGlobalSplitPanel(false); setGlobalSplitScope(null); }} className="text-purple-300 hover:text-purple-600 text-lg leading-none px-1">✕</button>
          </div>

          {/* Scope selector */}
          <div className="px-4 pt-3 pb-2">
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: 'all'      as const, label: 'Toda la lista',    icon: '📋' },
                { value: 'perItem'  as const, label: 'Por ítem',         icon: '📝' },
                { value: 'allExcept'as const, label: 'Lista excepto...', icon: '🔀' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (opt.value === 'perItem') {
                      setShowGlobalSplitPanel(false);
                      setShowBillSplitter(true);
                      return;
                    }
                    setGlobalSplitScope(opt.value);
                    if (opt.value !== 'allExcept') setExceptRowIndices(new Set());
                  }}
                  className={`py-2.5 px-1 rounded-xl border text-[11px] font-semibold transition-all flex flex-col items-center gap-1 ${
                    globalSplitScope === opt.value
                      ? 'border-purple-400 bg-purple-50 text-purple-800'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-purple-200'
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exception checklist */}
          {globalSplitScope === 'allExcept' && (
            <div className="px-4 pb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ítems con división diferente</p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {rows.map((r, rawIdx) => r.removed ? null : (
                  <label key={rawIdx} className="flex items-center gap-2 py-1.5 px-1 text-xs cursor-pointer hover:bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={exceptRowIndices.has(rawIdx)}
                      onChange={() => setExceptRowIndices((prev) => {
                        const next = new Set(prev);
                        if (next.has(rawIdx)) next.delete(rawIdx); else next.add(rawIdx);
                        return next;
                      })}
                      className="accent-purple-500"
                    />
                    <span className="flex-1 truncate text-gray-700">{r.concept || `Ítem ${rawIdx + 1}`}</span>
                    <span className="text-gray-400 flex-shrink-0">${parseFloat(r.amount || '0').toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Participant/mode selector (equal and percent only for global split) */}
          {(globalSplitScope === 'all' || globalSplitScope === 'allExcept') && (
            <>
              <div className="px-4 pt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Distribución</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: 'equal'   as SplitMode, label: '÷ Partes iguales' },
                    { value: 'percent' as SplitMode, label: '% Por porcentaje' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setSplitMode(opt.value); setSplitShares({}); }}
                      className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                        splitMode === opt.value
                          ? 'border-teal-500 bg-teal-50 text-teal-800'
                          : 'border-gray-200 bg-white text-gray-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Participantes</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {splitMembers
                    .filter((m) => m.name !== currentUser)
                    .map((m) => {
                      const isAdded = splitParticipants.includes(m.name);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            isAdded ? removeParticipant(m.name) : setSplitParticipants((p) => [...p, m.name])
                          }
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            isAdded ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'
                          }`}
                          style={isAdded ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}
                        >
                          {isAdded ? '✓ ' : '+ '}{m.name}
                        </button>
                      );
                    })}
                </div>

                {splitMode === 'percent' && splitParticipants.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {splitParticipants.map((name) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="flex-1 text-xs text-gray-600 truncate">{name}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={splitShares[name] ?? ''}
                          onChange={(e) => updateShare(name, e.target.value)}
                          placeholder="%"
                          className={`w-16 text-xs text-right border rounded-lg px-2 py-1 outline-none focus:ring-1 ${
                            sharesValid ? 'border-gray-200 focus:ring-teal-300' : 'border-red-300 focus:ring-red-300'
                          }`}
                        />
                        <span className="text-xs text-gray-400 w-4">%</span>
                      </div>
                    ))}
                    {!sharesValid && (
                      <p className="text-xs text-red-500">Los porcentajes superan el 100%</p>
                    )}
                  </div>
                )}
              </div>

              {splitParticipants.length > 0 && sharesValid && (
                <div className="px-4 pb-3">
                  <button
                    type="button"
                    onClick={applyGlobalSplit}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--soi-teal)' }}
                  >
                    Aplicar a {globalSplitScope === 'allExcept' && exceptRowIndices.size > 0
                      ? `${activeRows.length - exceptRowIndices.size} ítem${activeRows.length - exceptRowIndices.size !== 1 ? 's' : ''}`
                      : 'toda la lista'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Inline 3-mode split panel (single expense only) ── */}
      {showSingleSplit && !isTicket && splitMembers.length > 1 && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-purple-100 bg-purple-50">
            <p className="text-sm font-bold text-purple-800">División del gasto</p>
            <p className="text-xs text-purple-500 mt-0.5">
              Se guarda un solo registro · Las obligaciones quedan en el análisis mensual
            </p>
          </div>

          {/* Distribution mode */}
          <div className="px-4 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Distribución</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: 'equal',   label: '÷ Partes iguales' },
                { value: 'percent', label: '% Por porcentaje' },
                { value: 'amount',  label: '$ Por monto' },
              ] as { value: SplitMode; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setSplitMode(opt.value); setSplitShares({}); }}
                  className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                    splitMode === opt.value
                      ? 'border-teal-500 bg-teal-50 text-teal-800'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Participantes</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {splitMembers
                .filter((m) => m.name !== splitPayer)
                .map((m) => {
                  const isAdded = splitParticipants.includes(m.name);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        isAdded ? removeParticipant(m.name) : setSplitParticipants((p) => [...p, m.name])
                      }
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isAdded ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'
                      }`}
                      style={isAdded ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}
                    >
                      {isAdded ? '✓ ' : '+ '}{m.name}
                    </button>
                  );
                })}
            </div>

            {/* Custom name */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={customSplitName}
                onChange={(e) => setCustomSplitName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const name = customSplitName.trim();
                    if (name && !splitParticipants.includes(name)) setSplitParticipants((p) => [...p, name]);
                    setCustomSplitName('');
                  }
                }}
                placeholder="Otro nombre..."
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  const name = customSplitName.trim();
                  if (name && !splitParticipants.includes(name)) setSplitParticipants((p) => [...p, name]);
                  setCustomSplitName('');
                }}
                className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold"
              >+</button>
            </div>

            {/* Per-participant rows */}
            {splitParticipants.length > 0 && splitTotal > 0 && (
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[9px]"
                    style={{ backgroundColor: memberColorOf(splitPayer) }}
                  >
                    {splitPayer.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                    {splitPayer} <span className="text-gray-400 font-normal">(pagó)</span>
                  </span>
                  {splitMode !== 'equal' && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {splitMode === 'percent' ? `${payerPercent.toFixed(1)}%` : ''}
                    </span>
                  )}
                  <span className="text-sm font-bold text-teal-700 flex-shrink-0">${fmt$(payerAmount)}</span>
                </div>

                {splitParticipants.map((name) => {
                  const amt = participantAmount(name);
                  return (
                    <div key={name} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[9px]"
                        style={{ backgroundColor: memberColorOf(name) }}
                      >
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                        {name} <span className="ml-1 text-[10px] text-teal-600 font-normal">debe</span>
                      </span>
                      {splitMode !== 'equal' && (
                        <input
                          type="number"
                          inputMode="decimal"
                          value={splitShares[name] ?? ''}
                          onChange={(e) => updateShare(name, e.target.value)}
                          placeholder={splitMode === 'percent' ? '%' : '$'}
                          className={`w-16 text-xs text-right border rounded-lg px-2 py-1 outline-none focus:ring-1 ${
                            sharesValid ? 'border-gray-200 focus:ring-teal-300' : 'border-red-300 focus:ring-red-300'
                          }`}
                        />
                      )}
                      <span className="text-sm font-bold text-gray-700 flex-shrink-0 w-16 text-right">${fmt$(amt)}</span>
                      <button
                        type="button"
                        onClick={() => removeParticipant(name)}
                        className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
                      >✕</button>
                    </div>
                  );
                })}

                {!sharesValid && (
                  <p className="text-xs text-red-500 text-center py-1">
                    {splitMode === 'percent' ? 'Los porcentajes superan el 100%' : 'Los montos superan el total'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          {splitTotal > 0 && splitParticipants.length > 0 && sharesValid && (
            <div className="mx-4 my-3 bg-teal-50 border border-teal-100 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-xs text-teal-600">{splitPayer} pagó</p>
                <p className="text-sm font-extrabold text-teal-800">${fmt$(splitTotal)}</p>
              </div>
              <div className="border-t border-teal-100 pt-1.5 space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-teal-600">Corresponde a {splitPayer}</span>
                  <span className="font-semibold text-teal-800">${fmt$(payerAmount)}</span>
                </div>
                {splitParticipants.map((name) => (
                  <div key={name} className="flex justify-between text-xs">
                    <span className="text-gray-500">{name} debe</span>
                    <span className="font-semibold text-gray-700">${fmt$(participantAmount(name))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showBillSplitter && (
        <BillSplitter
          items={activeRows.map((r) => ({ concept: r.concept, amount: parseFloat(r.amount) || 0 }))}
          members={currentSpaceMembers(activeRows[0]?.spaceId ?? defaultSpaceId)}
          onClose={() => setShowBillSplitter(false)}
          onApplySplit={handleApplySplit}
          onApplyProrate={handleApplyProrate}
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
