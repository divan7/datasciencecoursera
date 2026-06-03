import { useState, useRef, useEffect, useMemo } from 'react';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, User, Category, PaymentMethod, ExpenseType, Frequency, TransactionType, ObligationEntry } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS, FREQUENCIES, INCOME_CATEGORIES } from '../types/expense';
import type { FixedExpenseTemplate } from '../types/fixedExpense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

type SplitMode = 'equal' | 'percent' | 'amount';
type SplitType = 'own' | 'prorate';

interface QuickFormProps {
  currentUser: User;
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSaveMultiple?: (expenses: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  prefill?: Partial<Expense>;
  members: SpaceMember[];
  fixedSuggestions?: FixedExpenseTemplate[];
  pendingIds?: Set<string>;
}

const CATEGORY_ICONS: Record<string, string> = {
  alimentacion: '🛒', transporte: '🚗', hogar: '🏠', salud: '💊',
  educacion: '📚', entretenimiento: '🎬', ropa: '👗', servicios: '💡',
  seguros: '🛡️', suscripciones: '📱', viajes: '✈️', restaurantes: '🍽️',
  mascotas: '🐾', belleza: '💅', inversiones: '📈', deudas: '💳', otro: '📦',
  salario: '💼', freelance: '💻', negocio: '🏪', inversiones_ingreso: '📈',
  renta: '🏠', bono: '🎁', reembolso: '💰', otro_ingreso: '📦',
};

const QUICK_EXPENSE_CATS: Category[] = ['alimentacion', 'restaurantes', 'transporte', 'hogar', 'salud', 'entretenimiento', 'servicios', 'otro'];
const QUICK_INCOME_CATS = ['salario', 'freelance', 'negocio', 'bono', 'renta', 'reembolso'];

export function QuickForm({ currentUser, onSave, onSaveMultiple, prefill, members, fixedSuggestions = [], pendingIds }: QuickFormProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const conceptRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [transactionType, setTransactionType] = useState<TransactionType>(
    prefill?.transactionType ?? 'gasto'
  );

  const [form, setForm] = useState({
    date: prefill?.date ?? today,
    amount: prefill?.amount ? String(prefill.amount) : '',
    concept: prefill?.concept ?? '',
    category: prefill?.category ?? 'otro' as string,
    paymentMethod: prefill?.paymentMethod ?? 'tarjeta_debito' as PaymentMethod,
    cardLast4: prefill?.cardLast4 ?? '',
    bank: prefill?.bank ?? '',
    store: prefill?.store ?? '',
    expenseType: prefill?.expenseType ?? 'variable' as ExpenseType,
    frequency: prefill?.frequency ?? 'mensual' as Frequency,
    installments: prefill?.installments ? String(prefill.installments) : '',
    isReimbursable: prefill?.isReimbursable ?? false,
    isTaxDeductible: prefill?.isTaxDeductible ?? false,
    invoiceRequested: prefill?.invoiceRequested ?? false,
    sharedExpense: prefill?.sharedExpense ?? false,
    paidBy: prefill?.paidBy ?? currentUser,
    notes: prefill?.notes ?? '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>('own');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [splitParticipants, setSplitParticipants] = useState<string[]>([]);
  // maps participant name → their raw input (% or $amount depending on splitMode)
  const [splitShares, setSplitShares] = useState<Record<string, number>>({});
  const [splitTotal, setSplitTotal] = useState('');
  const [customSplitName, setCustomSplitName] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const isIncome = transactionType === 'ingreso';
  const quickCats = isIncome ? QUICK_INCOME_CATS : QUICK_EXPENSE_CATS;
  const allCats = isIncome ? INCOME_CATEGORIES : CATEGORIES;

  // ── Split math ───────────────────────────────────────────────────
  const totalAmt = parseFloat(splitTotal) || 0;
  const nPeople = splitParticipants.length + 1; // +1 for current user

  // Amount each "other" participant owes
  const participantAmount = (name: string): number => {
    if (!totalAmt) return 0;
    if (splitMode === 'equal') return totalAmt / nPeople;
    if (splitMode === 'percent') return totalAmt * (splitShares[name] ?? 0) / 100;
    return splitShares[name] ?? 0; // amount mode
  };

  // Derived user's amount (remainder after others)
  const userAmount = useMemo(() => {
    if (!totalAmt) return 0;
    if (splitMode === 'equal') return totalAmt / nPeople;
    const othersSum = splitParticipants.reduce((s, n) => s + participantAmount(n), 0);
    return Math.max(0, totalAmt - othersSum);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmt, splitMode, splitParticipants, splitShares, nPeople]);

  // User's derived % (for display in percent mode)
  const userPercent = useMemo(() => {
    if (splitMode !== 'percent') return 0;
    const othersSum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
    return Math.max(0, 100 - othersSum);
  }, [splitMode, splitParticipants, splitShares]);

  // Validation: check if shares are consistent
  const sharesValid = useMemo(() => {
    if (!totalAmt || splitMode === 'equal') return true;
    if (splitMode === 'percent') {
      const othersSum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
      return othersSum <= 100.001;
    }
    const othersSum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
    return othersSum <= totalAmt + 0.01;
  }, [totalAmt, splitMode, splitParticipants, splitShares]);

  const updateShare = (name: string, val: string) => {
    const n = parseFloat(val) || 0;
    setSplitShares((prev) => ({ ...prev, [name]: n }));
  };

  const removeParticipant = (name: string) => {
    setSplitParticipants((p) => p.filter((n) => n !== name));
    setSplitShares((prev) => { const next = { ...prev }; delete next[name]; return next; });
  };

  const buildObligations = (): ObligationEntry[] | undefined => {
    if (!splitEnabled || !totalAmt || splitParticipants.length === 0) return undefined;
    const obligations: ObligationEntry[] = [
      {
        name: form.paidBy,
        amount: parseFloat(userAmount.toFixed(2)),
        ...(splitMode === 'percent' ? { percent: userPercent } : {}),
      },
      ...splitParticipants.map((name) => ({
        name,
        amount: parseFloat(participantAmount(name).toFixed(2)),
        ...(splitMode === 'percent' ? { percent: splitShares[name] ?? 0 } : {}),
      })),
    ];
    return obligations;
  };

  const resetSplit = () => {
    setSplitEnabled(false);
    setSplitType('own');
    setSplitMode('equal');
    setSplitParticipants([]);
    setSplitShares({});
    setSplitTotal('');
    setCustomSplitName('');
  };

  // ── Autocomplete ─────────────────────────────────────────────────
  const filteredSuggestions = useMemo(() => {
    if (prefill !== undefined || !fixedSuggestions.length) return [];
    const q = form.concept.toLowerCase().trim();
    const matched = fixedSuggestions.filter((t) =>
      q === '' || t.concept.toLowerCase().includes(q)
    );
    return [
      ...matched.filter((t) => pendingIds?.has(t.id)),
      ...matched.filter((t) => !pendingIds?.has(t.id)),
    ];
  }, [fixedSuggestions, form.concept, pendingIds, prefill]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (conceptRef.current && !conceptRef.current.closest('.concept-wrapper')?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applySuggestion = (tpl: FixedExpenseTemplate) => {
    setForm((f) => ({
      ...f,
      concept:       tpl.concept,
      amount:        tpl.expectedAmount > 0 ? String(tpl.expectedAmount) : f.amount,
      category:      tpl.category,
      paymentMethod: tpl.paymentMethod,
      bank:          tpl.bank ?? f.bank,
      cardLast4:     tpl.cardLast4 ?? f.cardLast4,
      expenseType:   'fijo',
      frequency:     tpl.frequency,
      paidBy:        tpl.paidBy,
    }));
    setTransactionType('gasto');
    setShowSuggestions(false);
    setTimeout(() => conceptRef.current?.blur(), 0);
  };

  const handleTransactionSwitch = (t: TransactionType) => {
    setTransactionType(t);
    set('category', isIncome ? 'otro' : 'salario');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isSplit = splitEnabled && (splitParticipants.length > 0 || splitType === 'own');
    const rawAmount = isSplit && splitTotal ? splitTotal : form.amount;
    if (!rawAmount || !form.concept) return;

    const baseData = {
      transactionType,
      date: form.date,
      currency: 'MXN',
      paidBy: form.paidBy as User,
      concept: form.concept,
      category: form.category as Category,
      paymentMethod: form.paymentMethod,
      cardLast4: form.cardLast4 || undefined,
      bank: form.bank || undefined,
      store: form.store || undefined,
      expenseType: form.expenseType,
      frequency: form.expenseType === 'fijo' ? form.frequency : undefined,
      installments: form.installments ? parseInt(form.installments) : undefined,
      isReimbursable: form.isReimbursable,
      isTaxDeductible: form.isTaxDeductible,
      invoiceRequested: form.invoiceRequested,
      notes: form.notes || undefined,
      receiptImageBase64: prefill?.receiptImageBase64,
    } as const;

    const obligations = buildObligations();

    if (isSplit && splitTotal && totalAmt > 0) {
      if (splitType === 'prorate' && onSaveMultiple) {
        const allExpenses: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        // Prorate: each member records their own share — no obligations[] to avoid
        // double-counting in balance analysis (each person pays exactly their own amount).
        allExpenses.push({
          ...baseData,
          amount: userAmount,
          sharedExpense: true,
          totalAmount: totalAmt,
          splitWith: splitParticipants,
        });
        for (const name of splitParticipants) {
          const isMember = members.some((m) => m.name === name);
          if (isMember) {
            const theirAmount = participantAmount(name);
            const theirSplitWith = [form.paidBy, ...splitParticipants.filter((n) => n !== name)];
            allExpenses.push({
              ...baseData,
              paidBy: name as User,
              amount: theirAmount,
              sharedExpense: true,
              totalAmount: totalAmt,
              splitWith: theirSplitWith,
            });
          }
        }
        onSaveMultiple(allExpenses);
      } else {
        onSave({
          ...baseData,
          amount: userAmount,
          sharedExpense: true,
          totalAmount: totalAmt,
          splitWith: splitParticipants.length > 0 ? splitParticipants : undefined,
          obligations,
        });
      }
    } else {
      onSave({
        ...baseData,
        amount: parseFloat(rawAmount),
        sharedExpense: form.sharedExpense,
      });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    setForm({
      date: today, amount: '', concept: '', category: 'otro',
      paymentMethod: 'tarjeta_debito', cardLast4: '', bank: '', store: '',
      expenseType: 'variable', frequency: 'mensual', installments: '',
      isReimbursable: false, isTaxDeductible: false, invoiceRequested: false,
      sharedExpense: false, paidBy: currentUser, notes: '',
    });
    resetSplit();
    setShowAdvanced(false);
  };

  // ── Shared split UI pieces ───────────────────────────────────────
  const memberColorOf = (name: string) => {
    const m = members.find((m) => m.name === name);
    return m ? MEMBER_COLORS[m.colorIndex] : '#9ca3af';
  };

  const fmt$ = (v: number) =>
    v.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction type toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        <button
          type="button"
          onClick={() => handleTransactionSwitch('gasto')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            !isIncome ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500'
          }`}
        >
          💸 Gasto
        </button>
        <button
          type="button"
          onClick={() => handleTransactionSwitch('ingreso')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${isIncome ? 'text-white shadow-sm' : 'text-gray-500'}`}
          style={isIncome ? { backgroundColor: '#cc7a55' } : {}}
        >
          💰 Ingreso
        </button>
      </div>

      {/* Expense type toggle */}
      {!isIncome && (
        <div className="space-y-2">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => set('expenseType', 'variable')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                form.expenseType === 'variable' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'
              }`}
            >
              💳 Variable
            </button>
            <button
              type="button"
              onClick={() => set('expenseType', 'fijo')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                form.expenseType === 'fijo' ? 'text-white shadow-sm' : 'text-gray-400'
              }`}
              style={form.expenseType === 'fijo' ? { backgroundColor: 'var(--soi-teal)' } : {}}
            >
              🔄 Fijo
            </button>
          </div>

          {form.expenseType === 'fijo' && (
            <select value={form.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)}
              className="w-full px-3 py-2 border border-teal-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-teal-50 text-teal-800 font-medium">
              {Object.entries(FREQUENCIES).map(([key, label]) => (
                <option key={key} value={key}>{label as string}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Amount — shows differently when split is active */}
      {!(splitEnabled && splitTotal) && (
        <div className={`rounded-2xl p-4 border-2 ${isIncome ? '' : 'bg-teal-50 border-teal-100'}`}
          style={isIncome ? { backgroundColor: '#f5ede6', borderColor: '#e8c4a8' } : {}}>
          <label className={`block text-xs font-semibold uppercase tracking-wide mb-1 ${isIncome ? 'text-[#a85a3a]' : 'text-teal-700'}`}>
            Monto (MXN)
          </label>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${isIncome ? 'text-[#cc7a55]' : 'text-teal-800'}`}>$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
              className={`flex-1 text-3xl font-bold bg-transparent border-none outline-none ${isIncome ? 'text-[#a85a3a] placeholder-[#e8b89a]' : 'text-teal-900 placeholder-teal-300'}`}
            />
          </div>
        </div>
      )}

      {/* Concept */}
      <div className="concept-wrapper relative">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {isIncome ? '¿De dónde proviene?' : 'Concepto *'}
        </label>
        <input
          ref={conceptRef}
          type="text"
          required
          value={form.concept}
          onChange={(e) => { set('concept', e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={isIncome ? 'Ej. Quincena enero, Pago cliente...' : '¿En qué se gastó?'}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          autoComplete="off"
        />
        {showSuggestions && !isIncome && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-52 overflow-y-auto">
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Gastos fijos registrados</p>
            </div>
            {filteredSuggestions.map((tpl) => {
              const isPending = pendingIds?.has(tpl.id);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applySuggestion(tpl); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-teal-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <span className="text-lg flex-shrink-0">{CATEGORY_ICONS[tpl.category] ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tpl.concept}</p>
                      {isPending && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">pendiente</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      ${tpl.expectedAmount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                      {' · '}{(CATEGORIES[tpl.category as keyof typeof CATEGORIES] as string ?? '').replace(/^[^ ]+ /, '')}
                      {tpl.dayOfMonth ? ` · día ${tpl.dayOfMonth}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-teal-600 font-medium flex-shrink-0">↵ usar</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Store */}
      {!isIncome && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            📍 Establecimiento <span className="text-gray-300 font-normal normal-case">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.store}
            onChange={(e) => set('store', e.target.value)}
            placeholder="Walmart, OXXO, Amazon..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>
      )}

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoría</label>
        <div className="grid grid-cols-4 gap-2">
          {quickCats.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => set('category', cat)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                form.category === cat
                  ? 'border-teal-600 bg-teal-50 text-teal-800 font-semibold'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
              <span className="leading-tight text-center">{(allCats as Record<string,string>)[cat]?.replace(/^[^ ]+ /, '')}</span>
            </button>
          ))}
        </div>
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          {Object.entries(allCats).map(([key, label]) => (
            <option key={key} value={key}>{label as string}</option>
          ))}
        </select>
      </div>

      {/* Payment method */}
      {!isIncome && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Forma de pago</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('paymentMethod', key as PaymentMethod)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  form.paymentMethod === key
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'border-gray-200 text-gray-500 hover:border-teal-300'
                }`}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date + Who */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {isIncome ? 'Quién recibió' : 'Quién pagó'}
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => set('paidBy', member.name)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 ${
                  form.paidBy === member.name
                    ? 'text-white border-transparent'
                    : 'border-gray-200 text-gray-500 bg-white'
                }`}
                style={form.paidBy === member.name ? { backgroundColor: MEMBER_COLORS[member.colorIndex] } : {}}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: MEMBER_COLORS[member.colorIndex], fontSize: '9px' }}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </span>
                {member.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced toggle */}
      {!isIncome && (
        <>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full text-xs text-teal-600 font-medium py-1"
          >
            {showAdvanced ? '▲ Menos opciones' : '▼ Más opciones (banco, tarjeta, MSI...)'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 border border-gray-100 rounded-xl p-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Banco / Emisor</label>
                  <input type="text" value={form.bank} onChange={(e) => set('bank', e.target.value)}
                    placeholder="BBVA, Banamex..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Últimos 4 dígitos</label>
                  <input type="text" maxLength={4} value={form.cardLast4}
                    onChange={(e) => set('cardLast4', e.target.value.replace(/\D/g, ''))}
                    placeholder="1234" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">MSI (meses)</label>
                <input type="number" min="0" max="48" value={form.installments}
                  onChange={(e) => set('installments', e.target.value)}
                  placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'isReimbursable', label: '💰 Reembolsable' },
                  { key: 'isTaxDeductible', label: '🧾 Deducible' },
                  { key: 'invoiceRequested', label: '📋 Con factura' },
                  { key: 'sharedExpense', label: '👥 Compartido' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                      onChange={(e) => set(key, e.target.checked)} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>

              {form.isTaxDeductible && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-amber-800">🧾 Gasto potencialmente deducible</p>
                  <p className="text-xs text-amber-700">
                    Para deducirlo necesitas un CFDI (factura electrónica) a nombre tuyo con tu RFC.
                    Solicítala en el establecimiento o en su portal web antes de salir.
                  </p>
                  <p className="text-xs text-amber-600">
                    💡 Configura tu perfil fiscal en Ajustes para recomendaciones según tu régimen.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notas</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                  placeholder="Observaciones adicionales..." rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none" />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Split / Prorate section ─────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {/* Toggle header */}
        <button
          type="button"
          onClick={() => setSplitEnabled((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users size={16} className={splitEnabled ? 'text-teal-600' : 'text-gray-400'} />
            <span className={`text-sm font-semibold ${splitEnabled ? 'text-teal-700' : 'text-gray-500'}`}>
              Dividir {isIncome ? 'ingreso' : 'gasto'}
            </span>
          </div>
          <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${splitEnabled ? 'bg-teal-600' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${splitEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>

        {splitEnabled && (
          <div className="border-t border-gray-100 bg-gray-50">

            {/* ── Split type ── */}
            <div className="px-4 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo de registro</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitType('own')}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                    splitType === 'own'
                      ? 'border-teal-500 bg-teal-50 text-teal-800'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  <div className="font-bold mb-0.5">Solo mi parte</div>
                  <div className="font-normal text-[10px] leading-tight opacity-70">
                    Se guarda 1 registro con tu parte
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('prorate')}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                    splitType === 'prorate'
                      ? 'border-teal-500 bg-teal-50 text-teal-800'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  <div className="font-bold mb-0.5">Prorratear</div>
                  <div className="font-normal text-[10px] leading-tight opacity-70">
                    Se guardan registros de cada miembro
                  </div>
                </button>
              </div>
            </div>

            {/* ── Total ── */}
            <div className="px-4 pt-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                Total {isIncome ? 'del ingreso' : 'de la cuenta'}
              </label>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2.5">
                <span className="text-gray-400 text-lg">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={splitTotal}
                  onChange={(e) => setSplitTotal(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 text-xl font-bold bg-transparent border-none outline-none text-gray-800 placeholder-gray-300"
                />
              </div>
            </div>

            {/* ── Distribution mode ── */}
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

            {/* ── Participants ── */}
            <div className="px-4 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Participantes{splitType === 'prorate' && ' (miembros = registro propio)'}
              </p>

              {/* Member chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {members
                  .filter((m) => m.name !== form.paidBy)
                  .map((m) => {
                    const isAdded = splitParticipants.includes(m.name);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          isAdded
                            ? removeParticipant(m.name)
                            : setSplitParticipants((p) => [...p, m.name])
                        }
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          isAdded ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'
                        }`}
                        style={isAdded ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}
                      >
                        {isAdded ? '✓ ' : '+ '}{m.name}
                        {splitType === 'prorate' && isAdded && <span className="ml-1 opacity-70">📋</span>}
                      </button>
                    );
                  })}
              </div>

              {/* Custom name input */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={customSplitName}
                  onChange={(e) => setCustomSplitName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const name = customSplitName.trim();
                      if (name && !splitParticipants.includes(name)) {
                        setSplitParticipants((p) => [...p, name]);
                      }
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

              {/* Per-participant share rows (when there are participants & total is set) */}
              {splitParticipants.length > 0 && totalAmt > 0 && (
                <div className="space-y-1.5 mt-2">
                  {/* Current user row */}
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[9px]"
                      style={{ backgroundColor: memberColorOf(form.paidBy) }}
                    >
                      {form.paidBy.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                      {form.paidBy} <span className="text-gray-400 font-normal">(tú)</span>
                    </span>
                    {splitMode !== 'equal' && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {splitMode === 'percent' ? `${userPercent.toFixed(1)}%` : ''}
                      </span>
                    )}
                    <span className="text-sm font-bold text-teal-700 flex-shrink-0">
                      ${fmt$(userAmount)}
                    </span>
                  </div>

                  {/* Other participants */}
                  {splitParticipants.map((name) => {
                    const isMember = members.some((m) => m.name === name);
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
                          {name}
                          {splitType === 'prorate' && isMember && (
                            <span className="ml-1 text-[10px] text-teal-600">registra</span>
                          )}
                          {splitType === 'prorate' && !isMember && (
                            <span className="ml-1 text-[10px] text-gray-400">externo</span>
                          )}
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
                        <span className="text-sm font-bold text-gray-700 flex-shrink-0 w-16 text-right">
                          ${fmt$(amt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeParticipant(name)}
                          className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
                        >✕</button>
                      </div>
                    );
                  })}

                  {/* Validation warning */}
                  {!sharesValid && (
                    <p className="text-xs text-red-500 text-center py-1">
                      {splitMode === 'percent'
                        ? 'Los porcentajes superan el 100%'
                        : 'Los montos superan el total'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Summary box ── */}
            {totalAmt > 0 && splitParticipants.length > 0 && sharesValid && (
              <div className="mx-4 my-3 bg-teal-50 border border-teal-100 rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-teal-600 mb-0.5">Tu parte ({nPeople} personas)</p>
                    <p className="text-2xl font-extrabold text-teal-800">${fmt$(userAmount)}</p>
                    <p className="text-xs text-teal-500 mt-0.5">de ${fmt$(totalAmt)} total</p>
                  </div>
                  {splitType === 'prorate' && (
                    <div className="text-right">
                      <p className="text-xs text-teal-600 mb-0.5">Registros a crear</p>
                      <p className="text-xl font-bold text-teal-800">
                        {1 + splitParticipants.filter((n) => members.some((m) => m.name === n)).length}
                      </p>
                      <p className="text-[10px] text-teal-500">
                        {splitParticipants.filter((n) => !members.some((m) => m.name === n)).length > 0 &&
                          `+${splitParticipants.filter((n) => !members.some((m) => m.name === n)).length} externos`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* bottom padding */}
            <div className="h-1" />
          </div>
        )}
      </div>

      {isIncome && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Notas</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder="Detalles adicionales..." rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none" />
        </div>
      )}

      <button
        type="submit"
        className={`w-full py-3 rounded-2xl font-bold text-white text-base transition-all ${
          saved ? 'bg-[#cc7a55]' : isIncome
            ? 'bg-[#cc7a55] hover:bg-[#a85a3a] active:scale-95'
            : 'bg-teal-700 hover:bg-teal-800 active:scale-95'
        }`}
      >
        {saved ? '✅ ¡Guardado!' : isIncome ? '💰 Guardar ingreso' : '💾 Guardar gasto'}
      </button>
    </form>
  );
}
