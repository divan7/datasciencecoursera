import { useState } from 'react';
import { format } from 'date-fns';
import type { Expense, User, Category, PaymentMethod, ExpenseType, Frequency } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS, FREQUENCIES } from '../types/expense';

interface QuickFormProps {
  currentUser: User;
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  prefill?: Partial<Expense>;
  userName1: string;
  userName2: string;
}

const CATEGORY_ICONS: Record<Category, string> = {
  alimentacion: '🛒', transporte: '🚗', hogar: '🏠', salud: '💊',
  educacion: '📚', entretenimiento: '🎬', ropa: '👗', servicios: '💡',
  seguros: '🛡️', suscripciones: '📱', viajes: '✈️', restaurantes: '🍽️',
  mascotas: '🐾', belleza: '💅', inversiones: '📈', deudas: '💳', otro: '📦',
};

const QUICK_CATEGORIES: Category[] = ['alimentacion', 'restaurantes', 'transporte', 'hogar', 'salud', 'entretenimiento', 'servicios', 'otro'];

export function QuickForm({ currentUser, onSave, prefill, userName1, userName2 }: QuickFormProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    date: prefill?.date ?? today,
    amount: prefill?.amount ? String(prefill.amount) : '',
    concept: prefill?.concept ?? '',
    category: prefill?.category ?? 'otro' as Category,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.concept) return;

    onSave({
      date: form.date,
      amount: parseFloat(form.amount),
      currency: 'MXN',
      paidBy: form.paidBy as User,
      concept: form.concept,
      category: form.category,
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

    // Reset form
    setForm({
      date: today,
      amount: '',
      concept: '',
      category: 'otro',
      paymentMethod: 'tarjeta_debito',
      cardLast4: '',
      bank: '',
      store: '',
      expenseType: 'variable',
      frequency: 'mensual',
      installments: '',
      isReimbursable: false,
      isTaxDeductible: false,
      invoiceRequested: false,
      sharedExpense: false,
      paidBy: currentUser,
      notes: '',
    });
    setShowAdvanced(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount - big and prominent */}
      <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-100">
        <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Monto (MXN)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-800">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
            className="flex-1 text-3xl font-bold text-blue-900 bg-transparent border-none outline-none placeholder-blue-300"
          />
        </div>
      </div>

      {/* Concept */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Concepto *
        </label>
        <input
          type="text"
          required
          value={form.concept}
          onChange={(e) => set('concept', e.target.value)}
          placeholder="¿En qué se gastó?"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Category quick select */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Categoría
        </label>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_CATEGORIES.map((cat) => (
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
              <span className="leading-tight text-center">{CATEGORIES[cat].replace(/^[^ ]+ /, '')}</span>
            </button>
          ))}
        </div>
        {/* More categories */}
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value as Category)}
          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Payment method */}
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
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date + Who paid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Fecha
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Quién pagó
          </label>
          <div className="flex gap-2">
            {(['Ivan', 'Esposa'] as User[]).map((user) => (
              <button
                key={user}
                type="button"
                onClick={() => set('paidBy', user)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  form.paidBy === user
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {user === 'Ivan' ? userName1 : userName2}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced toggle */}
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
              <input
                type="text"
                value={form.store}
                onChange={(e) => set('store', e.target.value)}
                placeholder="Walmart, OXXO..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Banco / Emisor</label>
              <input
                type="text"
                value={form.bank}
                onChange={(e) => set('bank', e.target.value)}
                placeholder="BBVA, Banamex..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Últimos 4 dígitos</label>
              <input
                type="text"
                maxLength={4}
                value={form.cardLast4}
                onChange={(e) => set('cardLast4', e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">MSI (meses)</label>
              <input
                type="number"
                min="0"
                max="48"
                value={form.installments}
                onChange={(e) => set('installments', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Expense type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de gasto</label>
            <div className="flex gap-2">
              {(['variable', 'fijo'] as ExpenseType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('expenseType', t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                    form.expenseType === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {form.expenseType === 'fijo' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Frecuencia</label>
              <select
                value={form.frequency}
                onChange={(e) => set('frequency', e.target.value as Frequency)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {Object.entries(FREQUENCIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'isReimbursable', label: '💰 Reembolsable' },
              { key: 'isTaxDeductible', label: '🧾 Deducible' },
              { key: 'invoiceRequested', label: '📋 Con factura' },
              { key: 'sharedExpense', label: '👥 Compartido' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => set(key, e.target.checked)}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        className={`w-full py-3 rounded-2xl font-bold text-white text-base transition-all ${
          saved
            ? 'bg-green-500'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
      >
        {saved ? '✅ ¡Guardado!' : '💾 Guardar gasto'}
      </button>
    </form>
  );
}
