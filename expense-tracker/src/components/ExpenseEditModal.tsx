import { useState } from 'react';
import { X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  Expense, Category, PaymentMethod, TransactionType, ExpenseType, Frequency,
} from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS, FREQUENCIES, INCOME_CATEGORIES } from '../types/expense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

interface ExpenseEditModalProps {
  expense: Expense;
  members: SpaceMember[];
  onSave: (id: string, data: Partial<Expense>) => void;
  onClose: () => void;
}

export function ExpenseEditModal({ expense, members, onSave, onClose }: ExpenseEditModalProps) {
  const [concept, setConcept]           = useState(expense.concept);
  const [amount, setAmount]             = useState(String(expense.amount));
  const [date, setDate]                 = useState(expense.date);
  const [transactionType, setTransType] = useState<TransactionType>(expense.transactionType);
  const [category, setCategory]         = useState<string>(expense.category);
  const [paymentMethod, setPayMethod]   = useState<PaymentMethod>(expense.paymentMethod);
  const [paidBy, setPaidBy]             = useState(expense.paidBy);
  const [store, setStore]               = useState(expense.store ?? '');
  const [bank, setBank]                 = useState(expense.bank ?? '');
  const [cardLast4, setCardLast4]       = useState(expense.cardLast4 ?? '');
  const [location, setLocation]         = useState(expense.location ?? '');
  const [expenseType, setExpenseType]   = useState<ExpenseType>(expense.expenseType);
  const [frequency, setFrequency]       = useState<Frequency | ''>(expense.frequency ?? '');
  const [installments, setInstallments] = useState(expense.installments ? String(expense.installments) : '');
  const [isReimbursable, setReimb]      = useState(expense.isReimbursable ?? false);
  const [isTaxDeductible, setTaxDed]    = useState(expense.isTaxDeductible ?? false);
  const [invoiceRequested, setInvoice]  = useState(expense.invoiceRequested ?? false);
  const [sharedExpense, setShared]      = useState(expense.sharedExpense ?? false);
  const [notes, setNotes]               = useState(expense.notes ?? '');
  const [tags, setTags]                 = useState((expense.tags ?? []).join(', '));
  const [showAdvanced, setShowAdv]      = useState(false);

  const categoryOptions = transactionType === 'ingreso' ? INCOME_CATEGORIES : CATEGORIES;
  const canSave = concept.trim() && parseFloat(amount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(expense.id, {
      concept:         concept.trim(),
      amount:          parseFloat(amount),
      date,
      transactionType,
      category:        category as Category,
      paymentMethod,
      paidBy,
      store:           store.trim() || undefined,
      bank:            bank.trim() || undefined,
      cardLast4:       cardLast4.trim() || undefined,
      location:        location.trim() || undefined,
      expenseType,
      frequency:       (frequency as Frequency) || undefined,
      installments:    installments ? parseInt(installments) : undefined,
      isReimbursable:  isReimbursable || undefined,
      isTaxDeductible: isTaxDeductible || undefined,
      invoiceRequested:invoiceRequested || undefined,
      sharedExpense:   sharedExpense || undefined,
      notes:           notes.trim() || undefined,
      tags:            tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    });
    onClose();
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300';
  const inputSmCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-300';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-gray-900">✏️ Editar registro</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 pb-8">
          {/* Concept */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Concepto *</label>
            <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)}
              className={inputCls} placeholder="Descripción del gasto" />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-6 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Transaction type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tipo</label>
            <div className="flex gap-2">
              {(['gasto', 'ingreso'] as TransactionType[]).map((t) => (
                <button key={t} type="button" onClick={() => setTransType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    transactionType === t
                      ? t === 'gasto' ? 'bg-teal-600 text-white border-teal-600' : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {t === 'gasto' ? '💸 Gasto' : '💰 Ingreso'}
                </button>
              ))}
            </div>
          </div>

          {/* Category + Payment method */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className={`${inputCls} bg-white appearance-none`}>
                {Object.entries(categoryOptions).map(([k, v]) => (
                  <option key={k} value={k}>{v as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Forma de pago</label>
              <select value={paymentMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className={`${inputCls} bg-white appearance-none`}>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>{v as string}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Paid by (member pills) */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Quién pagó</label>
            <div className="flex gap-1.5 flex-wrap">
              {members.map((m) => (
                <button key={m.id} type="button" onClick={() => setPaidBy(m.name)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    paidBy === m.name ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'
                  }`}
                  style={paidBy === m.name ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: MEMBER_COLORS[m.colorIndex], fontSize: '8px' }}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Store */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Establecimiento</label>
            <input type="text" value={store} onChange={(e) => setStore(e.target.value)}
              placeholder="Walmart, OXXO, etc. (opcional)"
              className={inputCls} />
          </div>

          {/* Advanced toggle */}
          <button type="button" onClick={() => setShowAdv(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 py-1">
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAdvanced ? 'Menos opciones' : 'Más opciones (banco, MSI, notas...)'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1 border-t border-gray-100">
              {/* Bank + card */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Banco</label>
                  <input type="text" value={bank} onChange={(e) => setBank(e.target.value)}
                    placeholder="BBVA, Banamex..." className={inputSmCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">4 últ. dígitos</label>
                  <input type="text" value={cardLast4} onChange={(e) => setCardLast4(e.target.value.slice(0, 4))}
                    placeholder="1234" maxLength={4} className={inputSmCls} />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Ciudad / Lugar</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="CDMX, Monterrey..." className={inputSmCls} />
              </div>

              {/* Expense type + frequency */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Tipo de gasto</label>
                  <select value={expenseType} onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
                    className={`${inputSmCls} bg-white`}>
                    <option value="variable">Variable</option>
                    <option value="fijo">Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Frecuencia</label>
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency | '')}
                    className={`${inputSmCls} bg-white`}>
                    <option value="">— ninguna —</option>
                    {Object.entries(FREQUENCIES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Installments */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Mensualidades (MSI)</label>
                <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)}
                  placeholder="3, 6, 12..." min="1" className={inputSmCls} />
              </div>

              {/* Boolean flags */}
              <div className="space-y-2">
                {[
                  { label: '💰 Reembolsable', val: isReimbursable, set: setReimb },
                  { label: '🧾 Deducible de impuestos', val: isTaxDeductible, set: setTaxDed },
                  { label: '📋 Factura solicitada', val: invoiceRequested, set: setInvoice },
                  { label: '👥 Gasto compartido', val: sharedExpense, set: setShared },
                ].map(({ label, val, set }) => (
                  <label key={label} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)}
                      className="w-4 h-4 accent-teal-600" />
                    {label}
                  </label>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Notas</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="Notas adicionales..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-1 focus:ring-teal-300" />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Etiquetas (separadas por coma)</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                  placeholder="súper, semanal, mercado..." className={inputSmCls} />
              </div>
            </div>
          )}

          {/* Save */}
          <button onClick={handleSave} disabled={!canSave}
            className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all mt-2"
            style={{ backgroundColor: 'var(--soi-teal)' }}
          >
            <Save size={16} />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
