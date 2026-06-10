import { useState, useMemo } from 'react';
import { X, Save, ChevronDown, ChevronUp, Users, ExternalLink } from 'lucide-react';
import type {
  Expense, Category, PaymentMethod, TransactionType, ExpenseType, Frequency, ObligationEntry,
} from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS, FREQUENCIES, INCOME_CATEGORIES } from '../types/expense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

type SplitMode = 'equal' | 'percent' | 'amount';

const VENDOR_PORTALS: Record<string, { name: string; url: string }> = {
  walmart: { name: 'Walmart', url: 'https://factura.walmart.com.mx' },
  'sams': { name: "Sam's Club", url: 'https://factura.samsclub.com.mx' },
  amazon: { name: 'Amazon México', url: 'https://factura.amazon.com.mx' },
  costco: { name: 'Costco', url: 'https://www.facturacostco.com' },
  homedepot: { name: 'Home Depot', url: 'https://factura.homedepot.com.mx' },
  liverpool: { name: 'Liverpool', url: 'https://factura.liverpool.com.mx' },
  soriana: { name: 'Soriana', url: 'https://factura.soriana.com' },
  chedraui: { name: 'Chedraui', url: 'https://factura.chedraui.com.mx' },
  '7eleven': { name: '7-Eleven', url: 'https://factura.7-eleven.com.mx' },
  oxxo: { name: 'OXXO', url: 'https://factura.oxxo.com' },
  elektra: { name: 'Elektra', url: 'https://factura.elektra.com.mx' },
  coppel: { name: 'Coppel', url: 'https://factura.coppel.com' },
  mercadolibre: { name: 'MercadoLibre', url: 'https://factura.mercadolibre.com.mx' },
};

function findVendorPortal(store: string) {
  const normalized = store.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, portal] of Object.entries(VENDOR_PORTALS)) {
    if (normalized.includes(key)) return portal;
  }
  return null;
}

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
  // ── Split / proration state ──────────────────────────────────────
  const [showSplit, setShowSplit] = useState(members.length > 1);

  // Detect split mode from existing obligations
  const [splitMode, setSplitMode] = useState<SplitMode>(() => {
    const obs = expense.obligations;
    if (!obs || obs.length === 0) return 'equal';
    if (obs.some((o) => o.percent !== undefined)) return 'percent';
    const first = obs[0].amount;
    if (obs.every((o) => Math.abs(o.amount - first) < 0.01)) return 'equal';
    return 'amount';
  });

  // Participants = members OTHER than paidBy who share the expense
  const [splitParticipants, setSplitParticipants] = useState<string[]>(() => {
    const obs = expense.obligations;
    if (obs && obs.length > 0) return obs.map((o) => o.name).filter((n) => n !== expense.paidBy);
    return members.filter((m) => m.name !== expense.paidBy).map((m) => m.name);
  });

  // Raw inputs per participant (% or $) — only used in percent/amount modes
  const [splitShares, setSplitShares] = useState<Record<string, number>>(() => {
    const obs = expense.obligations;
    if (!obs || obs.length === 0) return {};
    const shares: Record<string, number> = {};
    obs.forEach((o) => {
      if (o.name === expense.paidBy) return;
      shares[o.name] = o.percent !== undefined ? o.percent : o.amount;
    });
    return shares;
  });

  const [customSplitName, setCustomSplitName] = useState('');

  const categoryOptions = transactionType === 'ingreso' ? INCOME_CATEGORIES : CATEGORIES;
  const canSave = concept.trim() && parseFloat(amount) > 0;

  // ── Split math ────────────────────────────────────────────────────
  const totalAmt = parseFloat(amount) || 0;
  const nPeople  = splitParticipants.length + 1; // +1 for payer

  const participantAmount = (name: string): number => {
    if (!totalAmt) return 0;
    if (splitMode === 'equal')   return totalAmt / nPeople;
    if (splitMode === 'percent') return totalAmt * (splitShares[name] ?? 0) / 100;
    return splitShares[name] ?? 0;
  };

  const payerAmount = useMemo(() => {
    if (!totalAmt) return 0;
    if (splitMode === 'equal') return totalAmt / nPeople;
    const othersSum = splitParticipants.reduce((s, n) => s + participantAmount(n), 0);
    return Math.max(0, totalAmt - othersSum);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmt, splitMode, splitParticipants, splitShares, nPeople]);

  const payerPercent = useMemo(() => {
    if (splitMode !== 'percent') return 0;
    const othersSum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
    return Math.max(0, 100 - othersSum);
  }, [splitMode, splitParticipants, splitShares]);

  const sharesValid = useMemo(() => {
    if (!totalAmt || splitMode === 'equal') return true;
    if (splitMode === 'percent') {
      const sum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
      return sum <= 100.001;
    }
    const sum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
    return sum <= totalAmt + 0.01;
  }, [totalAmt, splitMode, splitParticipants, splitShares]);

  const memberColorOf = (name: string) => {
    const m = members.find((mem) => mem.name === name);
    return m ? MEMBER_COLORS[m.colorIndex] : '#9ca3af';
  };
  const fmt$ = (v: number) =>
    v.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const buildObligations = (): ObligationEntry[] | undefined => {
    if (!showSplit || splitParticipants.length === 0 || !totalAmt) return undefined;
    return [
      {
        name: paidBy,
        amount: parseFloat(payerAmount.toFixed(2)),
        ...(splitMode === 'percent' ? { percent: parseFloat(payerPercent.toFixed(2)) } : {}),
      },
      ...splitParticipants.map((name) => ({
        name,
        amount: parseFloat(participantAmount(name).toFixed(2)),
        ...(splitMode === 'percent' ? { percent: splitShares[name] ?? 0 } : {}),
      })),
    ];
  };

  const removeParticipant = (name: string) => {
    setSplitParticipants((p) => p.filter((n) => n !== name));
    setSplitShares((prev) => { const next = { ...prev }; delete next[name]; return next; });
  };

  const updateShare = (name: string, val: string) => {
    setSplitShares((prev) => ({ ...prev, [name]: parseFloat(val) || 0 }));
  };

  const equalizeAll = () => {
    setSplitMode('equal');
    setSplitShares({});
  };

  const handleSave = () => {
    if (!canSave) return;
    const activeObligations = buildObligations();
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
      sharedExpense:   (activeObligations ? true : sharedExpense) || undefined,
      obligations:     activeObligations,
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
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              {transactionType === 'ingreso' ? 'Quién recibió' : 'Quién pagó'}
            </label>
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

              {/* Tax tip when deductible is checked */}
              {isTaxDeductible && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-bold text-amber-800">🧾 Gasto potencialmente deducible</p>
                  <p className="text-xs text-amber-700">
                    Para deducirlo necesitas un CFDI (factura electrónica) a nombre tuyo con tu RFC.
                    {store && findVendorPortal(store) ? null : ' Pídela en el establecimiento o en su portal web.'}
                  </p>
                  {store && (() => {
                    const portal = findVendorPortal(store);
                    return portal ? (
                      <a
                        href={portal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline"
                      >
                        <ExternalLink size={12} />
                        Facturar en {portal.name}
                      </a>
                    ) : null;
                  })()}
                  <p className="text-xs text-amber-600">
                    💡 Configura tu perfil fiscal en Ajustes para recomendaciones personalizadas.
                  </p>
                </div>
              )}

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

          {/* Division / Obligations */}
          {members.length > 1 && (
            <div className="border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setShowSplit((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-purple-600 mb-2"
              >
                <Users size={14} />
                {showSplit ? 'Ocultar división' : 'Mostrar división'}
              </button>

              {showSplit && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-3">
                  <p className="text-xs text-purple-700 font-semibold">
                    {transactionType === 'ingreso'
                      ? 'Distribución del ingreso entre participantes'
                      : '¿A quién le corresponde pagar?'}
                  </p>

                  {/* Mode selector */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { value: 'equal',   label: '÷ Partes iguales' },
                      { value: 'percent', label: '% Porcentaje' },
                      { value: 'amount',  label: '$ Monto' },
                    ] as { value: SplitMode; label: string }[]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSplitMode(opt.value); setSplitShares({}); }}
                        className={`py-1.5 px-1 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                          splitMode === opt.value
                            ? 'border-purple-500 bg-purple-100 text-purple-800'
                            : 'border-purple-200 bg-white text-gray-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Participant chips (all members except payer) */}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Participantes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {members.filter((m) => m.name !== paidBy).map((m) => {
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
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                              isAdded ? 'text-white border-transparent' : 'border-purple-200 text-gray-500 bg-white'
                            }`}
                            style={isAdded ? { backgroundColor: memberColorOf(m.name) } : {}}
                          >
                            {isAdded ? '✓ ' : '+ '}{m.name}
                          </button>
                        );
                      })}
                    </div>
                    {/* Custom name */}
                    <div className="flex gap-2 mt-1.5">
                      <input
                        type="text"
                        value={customSplitName}
                        onChange={(e) => setCustomSplitName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const n = customSplitName.trim();
                            if (n && !splitParticipants.includes(n)) setSplitParticipants((p) => [...p, n]);
                            setCustomSplitName('');
                          }
                        }}
                        placeholder="Otro nombre..."
                        className="flex-1 px-2.5 py-1 border border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const n = customSplitName.trim();
                          if (n && !splitParticipants.includes(n)) setSplitParticipants((p) => [...p, n]);
                          setCustomSplitName('');
                        }}
                        className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold"
                      >+</button>
                    </div>
                  </div>

                  {/* Per-person rows */}
                  {splitParticipants.length > 0 && totalAmt > 0 && (
                    <div className="space-y-1.5">
                      {/* Payer row (auto-computed) */}
                      <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-purple-100">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[9px]"
                          style={{ backgroundColor: memberColorOf(paidBy) }}
                        >
                          {paidBy.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                          {paidBy} <span className="text-gray-400 font-normal">(pagó)</span>
                        </span>
                        {splitMode === 'percent' && (
                          <span className="text-xs text-gray-400 flex-shrink-0">{payerPercent.toFixed(1)}%</span>
                        )}
                        <span className="text-xs font-bold text-purple-700 flex-shrink-0">${fmt$(payerAmount)}</span>
                      </div>

                      {/* Other participants */}
                      {splitParticipants.map((name) => {
                        const amt = participantAmount(name);
                        return (
                          <div key={name} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-purple-100">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[9px]"
                              style={{ backgroundColor: memberColorOf(name) }}
                            >
                              {name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                              {name}
                              <span className="ml-1 text-[10px] text-purple-500 font-normal">
                                {transactionType === 'ingreso' ? 'aporta' : 'debe'}
                              </span>
                            </span>
                            {splitMode !== 'equal' && (
                              <input
                                type="number"
                                inputMode="decimal"
                                value={splitShares[name] ?? ''}
                                onChange={(e) => updateShare(name, e.target.value)}
                                placeholder={splitMode === 'percent' ? '%' : '$'}
                                className={`w-16 text-xs text-right border rounded-lg px-2 py-1 outline-none focus:ring-1 bg-white ${
                                  sharesValid ? 'border-purple-200 focus:ring-purple-300' : 'border-red-300 focus:ring-red-300'
                                }`}
                              />
                            )}
                            <span className="text-xs font-bold text-gray-700 flex-shrink-0 w-14 text-right">${fmt$(amt)}</span>
                            <button
                              type="button"
                              onClick={() => removeParticipant(name)}
                              className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
                            >✕</button>
                          </div>
                        );
                      })}

                      {!sharesValid && (
                        <p className="text-xs text-red-500 text-center">
                          {splitMode === 'percent' ? 'Los porcentajes superan el 100%' : 'Los montos superan el total'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <button type="button" onClick={equalizeAll}
                      className="text-xs text-purple-500 hover:text-purple-700">
                      ↺ Partes iguales
                    </button>
                  </div>

                  {/* Summary */}
                  {splitParticipants.length > 0 && totalAmt > 0 && sharesValid && (
                    <div className="bg-white border border-purple-100 rounded-xl p-2.5 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-purple-600">
                          {transactionType === 'ingreso' ? `${paidBy} recibió` : `${paidBy} pagó`}
                        </span>
                        <span className="font-bold text-purple-800">${fmt$(totalAmt)}</span>
                      </div>
                      <div className="border-t border-purple-50 pt-1 space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Corresponde a {paidBy}</span>
                          <span className="font-semibold text-gray-700">${fmt$(payerAmount)}</span>
                        </div>
                        {splitParticipants.map((name) => (
                          <div key={name} className="flex justify-between text-xs">
                            <span className="text-gray-500">
                              {name} {transactionType === 'ingreso' ? 'aporta' : 'debe'}
                            </span>
                            <span className="font-semibold text-gray-700">${fmt$(participantAmount(name))}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-purple-400">Se guarda 1 registro · Obligaciones en análisis mensual</p>
                    </div>
                  )}
                </div>
              )}
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
