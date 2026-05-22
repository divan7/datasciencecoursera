import { useState, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import type { Expense, User, Category, PaymentMethod, ExpenseType, Frequency, TransactionType } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS, FREQUENCIES, INCOME_CATEGORIES } from '../types/expense';
import type { FixedExpenseTemplate } from '../types/fixedExpense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

interface QuickFormProps {
  currentUser: User;
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  prefill?: Partial<Expense>;
  members: SpaceMember[];
  fixedSuggestions?: FixedExpenseTemplate[];   // plantillas para autocompletado
  pendingIds?: Set<string>;                     // IDs de checks pendientes este mes
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

export function QuickForm({ currentUser, onSave, prefill, members, fixedSuggestions = [], pendingIds }: QuickFormProps) {
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
  const [saved, setSaved] = useState(false);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const isIncome = transactionType === 'ingreso';
  const quickCats = isIncome ? QUICK_INCOME_CATS : QUICK_EXPENSE_CATS;
  const allCats = isIncome ? INCOME_CATEGORIES : CATEGORIES;

  // ── Autocomplete suggestions ─────────────────────────────────────
  const filteredSuggestions = useMemo(() => {
    if (prefill !== undefined || !fixedSuggestions.length) return [];
    const q = form.concept.toLowerCase().trim();
    const matched = fixedSuggestions.filter((t) =>
      q === '' || t.concept.toLowerCase().includes(q)
    );
    // Pending first, then rest
    return [
      ...matched.filter((t) => pendingIds?.has(t.id)),
      ...matched.filter((t) => !pendingIds?.has(t.id)),
    ];
  }, [fixedSuggestions, form.concept, pendingIds, prefill]);

  // Close suggestions when clicking outside
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
    if (!form.amount || !form.concept) return;

    onSave({
      transactionType,
      date: form.date,
      amount: parseFloat(form.amount),
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
      sharedExpense: form.sharedExpense,
      notes: form.notes || undefined,
      receiptImageBase64: prefill?.receiptImageBase64,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    setForm({
      date: today, amount: '', concept: '', category: 'otro',
      paymentMethod: 'tarjeta_debito', cardLast4: '', bank: '', store: '',
      expenseType: 'variable', frequency: 'mensual', installments: '',
      isReimbursable: false, isTaxDeductible: false, invoiceRequested: false,
      sharedExpense: false, paidBy: currentUser, notes: '',
    });
    setShowAdvanced(false);
  };

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
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            isIncome ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500'
          }`}
        >
          💰 Ingreso
        </button>
      </div>

      {/* Amount */}
      <div className={`rounded-2xl p-4 border-2 ${isIncome ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
        <label className={`block text-xs font-semibold uppercase tracking-wide mb-1 ${isIncome ? 'text-green-600' : 'text-blue-600'}`}>
          Monto (MXN)
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${isIncome ? 'text-green-800' : 'text-blue-800'}`}>$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
            className={`flex-1 text-3xl font-bold bg-transparent border-none outline-none ${isIncome ? 'text-green-900 placeholder-green-300' : 'text-blue-900 placeholder-blue-300'}`}
          />
        </div>
      </div>

      {/* Concept with autocomplete */}
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
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          autoComplete="off"
        />
        {/* Dropdown */}
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <span className="text-lg flex-shrink-0">
                    {CATEGORY_ICONS[tpl.category] ?? '📦'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tpl.concept}</p>
                      {isPending && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          pendiente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      ${tpl.expectedAmount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                      {' · '}
                      {(CATEGORIES[tpl.category as keyof typeof CATEGORIES] as string ?? '').replace(/^[^ ]+ /, '')}
                      {tpl.dayOfMonth ? ` · día ${tpl.dayOfMonth}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-blue-500 font-medium flex-shrink-0">↵ usar</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category quick select */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Categoría
        </label>
        <div className="grid grid-cols-4 gap-2">
          {quickCats.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => set('category', cat)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                form.category === cat
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
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
          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {Object.entries(allCats).map(([key, label]) => (
            <option key={key} value={key}>{label as string}</option>
          ))}
        </select>
      </div>

      {/* Payment method — only for expenses */}
      {!isIncome && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Forma de pago
          </label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('paymentMethod', key as PaymentMethod)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  form.paymentMethod === key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-500 hover:border-blue-300'
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
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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

      {/* Advanced toggle — only for expenses */}
      {!isIncome && (
        <>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full text-xs text-blue-500 font-medium py-1"
          >
            {showAdvanced ? '▲ Menos opciones' : '▼ Más opciones (establecimiento, tarjeta, MSI...)'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 border border-gray-100 rounded-xl p-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Establecimiento</label>
                  <input type="text" value={form.store} onChange={(e) => set('store', e.target.value)}
                    placeholder="Walmart, OXXO..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Banco / Emisor</label>
                  <input type="text" value={form.bank} onChange={(e) => set('bank', e.target.value)}
                    placeholder="BBVA, Banamex..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Últimos 4 dígitos</label>
                  <input type="text" maxLength={4} value={form.cardLast4}
                    onChange={(e) => set('cardLast4', e.target.value.replace(/\D/g, ''))}
                    placeholder="1234" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">MSI (meses)</label>
                  <input type="number" min="0" max="48" value={form.installments}
                    onChange={(e) => set('installments', e.target.value)}
                    placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de gasto</label>
                <div className="flex gap-2">
                  {(['variable', 'fijo'] as ExpenseType[]).map((t) => (
                    <button key={t} type="button" onClick={() => set('expenseType', t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                        form.expenseType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500'
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {form.expenseType === 'fijo' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Frecuencia</label>
                  <select value={form.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {Object.entries(FREQUENCIES).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))}
                  </select>
                </div>
              )}

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

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notas</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                  placeholder="Observaciones adicionales..." rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
            </div>
          )}
        </>
      )}

      {isIncome && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Notas</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder="Detalles adicionales..." rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
        </div>
      )}

      <button
        type="submit"
        className={`w-full py-3 rounded-2xl font-bold text-white text-base transition-all ${
          saved ? 'bg-green-500' : isIncome
            ? 'bg-green-600 hover:bg-green-700 active:scale-95'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
      >
        {saved ? '✅ ¡Guardado!' : isIncome ? '💰 Guardar ingreso' : '💾 Guardar gasto'}
      </button>
    </form>
  );
}
