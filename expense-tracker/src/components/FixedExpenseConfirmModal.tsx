import { useState, useMemo } from 'react';
import { X, Save, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, ObligationEntry, Category, PaymentMethod } from '../types/expense';
import { PAYMENT_METHODS } from '../types/expense';
import type { FixedExpenseTemplate } from '../types/fixedExpense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

type SplitMode = 'equal' | 'percent' | 'amount';

interface Props {
  template: FixedExpenseTemplate;
  members: SpaceMember[];
  currentUser: string;
  month: string; // 'yyyy-MM'
  onConfirm: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

export function FixedExpenseConfirmModal({ template, members, currentUser, month, onConfirm, onClose }: Props) {
  const defaultDate = useMemo(() => {
    const day = template.dayOfMonth ?? parseInt(format(new Date(), 'dd'));
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
  }, [template, month]);

  const [amount, setAmount]         = useState(String(template.expectedAmount));
  const [date, setDate]             = useState(defaultDate);
  const [paidBy, setPaidBy]         = useState(template.paidBy ?? currentUser);
  const [paymentMethod, setPayment] = useState<PaymentMethod>(template.paymentMethod ?? 'tarjeta_debito');
  const [showSplit, setShowSplit]    = useState(members.length > 1);
  const [splitMode, setSplitMode]   = useState<SplitMode>('equal');
  const [splitParticipants, setParticipants] = useState<string[]>(
    members.filter((m) => m.name !== (template.paidBy ?? currentUser)).map((m) => m.name)
  );
  const [splitShares, setShares]    = useState<Record<string, number>>({});
  const [customName, setCustomName] = useState('');

  const totalAmt  = parseFloat(amount) || 0;
  const nPeople   = splitParticipants.length + 1;

  const participantAmount = (name: string): number => {
    if (!totalAmt) return 0;
    if (splitMode === 'equal')   return totalAmt / nPeople;
    if (splitMode === 'percent') return totalAmt * (splitShares[name] ?? 0) / 100;
    return splitShares[name] ?? 0;
  };

  const payerAmount = useMemo(() => {
    if (!totalAmt) return 0;
    if (splitMode === 'equal') return totalAmt / nPeople;
    const sum = splitParticipants.reduce((s, n) => s + participantAmount(n), 0);
    return Math.max(0, totalAmt - sum);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmt, splitMode, splitParticipants, splitShares, nPeople]);

  const payerPercent = useMemo(() => {
    if (splitMode !== 'percent') return 0;
    return Math.max(0, 100 - splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0));
  }, [splitMode, splitParticipants, splitShares]);

  const sharesValid = useMemo(() => {
    if (!totalAmt || splitMode === 'equal') return true;
    const sum = splitParticipants.reduce((s, n) => s + (splitShares[n] ?? 0), 0);
    return splitMode === 'percent' ? sum <= 100.001 : sum <= totalAmt + 0.01;
  }, [totalAmt, splitMode, splitParticipants, splitShares]);

  const memberColor = (name: string) => {
    const m = members.find((mem) => mem.name === name);
    return m ? MEMBER_COLORS[m.colorIndex] : '#9ca3af';
  };
  const fmt$ = (v: number) =>
    v.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const buildObligations = (): ObligationEntry[] | undefined => {
    if (!showSplit || splitParticipants.length === 0 || !totalAmt) return undefined;
    return [
      { name: paidBy, amount: parseFloat(payerAmount.toFixed(2)),
        ...(splitMode === 'percent' ? { percent: parseFloat(payerPercent.toFixed(2)) } : {}) },
      ...splitParticipants.map((n) => ({
        name: n, amount: parseFloat(participantAmount(n).toFixed(2)),
        ...(splitMode === 'percent' ? { percent: splitShares[n] ?? 0 } : {}),
      })),
    ];
  };

  const removeParticipant = (name: string) => {
    setParticipants((p) => p.filter((n) => n !== name));
    setShares((prev) => { const next = { ...prev }; delete next[name]; return next; });
  };

  const canConfirm = totalAmt > 0 && date && sharesValid;

  const handleConfirm = () => {
    if (!canConfirm) return;
    const obligations = buildObligations();
    onConfirm({
      concept:         template.concept,
      amount:          totalAmt,
      date,
      transactionType: 'gasto',
      currency:        'MXN',
      category:        template.category as Category,
      paymentMethod,
      paidBy,
      expenseType:     'fijo',
      frequency:       template.frequency,
      bank:            template.bank || undefined,
      cardLast4:       template.cardLast4 || undefined,
      sharedExpense:   obligations ? true : undefined,
      obligations,
    });
    onClose();
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">✅ Confirmar pago</h2>
            <p className="text-xs text-gray-400 truncate max-w-[240px]">{template.concept}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 pb-8">
          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Monto real *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Fecha de pago</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* PaidBy */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">¿Quién pagó?</label>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => (
                <button key={m.id} type="button"
                  onClick={() => { setPaidBy(m.name); setParticipants(members.filter((x) => x.name !== m.name).map((x) => x.name)); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    paidBy === m.name ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'
                  }`}
                  style={paidBy === m.name ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}
                >
                  {paidBy === m.name ? '✓ ' : ''}{m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Forma de pago</label>
            <select value={paymentMethod} onChange={(e) => setPayment(e.target.value as PaymentMethod)}
              className={inputCls}>
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Split section */}
          {members.length > 1 && (
            <div className="border-t border-gray-100 pt-3">
              <button type="button" onClick={() => setShowSplit((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-purple-600 mb-2">
                <Users size={14} />
                {showSplit ? 'Ocultar división' : 'Mostrar división'}
              </button>

              {showSplit && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-3">
                  <p className="text-xs text-purple-700 font-semibold">¿A quién le corresponde pagar?</p>

                  {/* Mode selector */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { value: 'equal',   label: '÷ Partes iguales' },
                      { value: 'percent', label: '% Porcentaje' },
                      { value: 'amount',  label: '$ Monto' },
                    ] as { value: SplitMode; label: string }[]).map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => { setSplitMode(opt.value); setShares({}); }}
                        className={`py-1.5 px-1 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                          splitMode === opt.value
                            ? 'border-purple-500 bg-purple-100 text-purple-800'
                            : 'border-purple-200 bg-white text-gray-500'
                        }`}>{opt.label}</button>
                    ))}
                  </div>

                  {/* Participant chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {members.filter((m) => m.name !== paidBy).map((m) => {
                      const added = splitParticipants.includes(m.name);
                      return (
                        <button key={m.id} type="button"
                          onClick={() => added ? removeParticipant(m.name) : setParticipants((p) => [...p, m.name])}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            added ? 'text-white border-transparent' : 'border-purple-200 text-gray-500 bg-white'
                          }`}
                          style={added ? { backgroundColor: memberColor(m.name) } : {}}>
                          {added ? '✓ ' : '+ '}{m.name}
                        </button>
                      );
                    })}
                    {/* Custom name */}
                    <div className="flex gap-1 w-full mt-1">
                      <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const n = customName.trim();
                            if (n && !splitParticipants.includes(n)) setParticipants((p) => [...p, n]);
                            setCustomName('');
                          }
                        }}
                        placeholder="Otro nombre..."
                        className="flex-1 px-2.5 py-1 border border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white" />
                      <button type="button"
                        onClick={() => { const n = customName.trim(); if (n && !splitParticipants.includes(n)) setParticipants((p) => [...p, n]); setCustomName(''); }}
                        className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">+</button>
                    </div>
                  </div>

                  {/* Per-person rows */}
                  {splitParticipants.length > 0 && totalAmt > 0 && (
                    <div className="space-y-1.5">
                      {/* Payer */}
                      <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-purple-100">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[9px]"
                          style={{ backgroundColor: memberColor(paidBy) }}>
                          {paidBy.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                          {paidBy} <span className="text-gray-400 font-normal">(pagó)</span>
                        </span>
                        {splitMode === 'percent' && <span className="text-xs text-gray-400">{payerPercent.toFixed(1)}%</span>}
                        <span className="text-xs font-bold text-purple-700">${fmt$(payerAmount)}</span>
                      </div>

                      {splitParticipants.map((name) => {
                        const amt = participantAmount(name);
                        return (
                          <div key={name} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-purple-100">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[9px]"
                              style={{ backgroundColor: memberColor(name) }}>
                              {name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                              {name}<span className="ml-1 text-[10px] text-purple-500 font-normal">debe</span>
                            </span>
                            {splitMode !== 'equal' && (
                              <input type="number" inputMode="decimal" value={splitShares[name] ?? ''}
                                onChange={(e) => setShares((prev) => ({ ...prev, [name]: parseFloat(e.target.value) || 0 }))}
                                placeholder={splitMode === 'percent' ? '%' : '$'}
                                className={`w-16 text-xs text-right border rounded-lg px-2 py-1 outline-none focus:ring-1 bg-white ${
                                  sharesValid ? 'border-purple-200 focus:ring-purple-300' : 'border-red-300 focus:ring-red-300'
                                }`} />
                            )}
                            <span className="text-xs font-bold text-gray-700 w-14 text-right">${fmt$(amt)}</span>
                            <button type="button" onClick={() => removeParticipant(name)}
                              className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                          </div>
                        );
                      })}

                      {!sharesValid && (
                        <p className="text-xs text-red-500 text-center">
                          {splitMode === 'percent' ? 'Los porcentajes superan el 100%' : 'Los montos superan el total'}
                        </p>
                      )}

                      {sharesValid && (
                        <div className="bg-white border border-purple-100 rounded-xl p-2.5 space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-purple-600">{paidBy} pagó</span>
                            <span className="font-bold text-purple-800">${fmt$(totalAmt)}</span>
                          </div>
                          <div className="border-t border-purple-50 pt-1 space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Corresponde a {paidBy}</span>
                              <span className="font-semibold text-gray-700">${fmt$(payerAmount)}</span>
                            </div>
                            {splitParticipants.map((n) => (
                              <div key={n} className="flex justify-between text-xs">
                                <span className="text-gray-500">{n} debe</span>
                                <span className="font-semibold text-gray-700">${fmt$(participantAmount(n))}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-purple-400">1 registro · obligaciones en análisis mensual</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button type="button" onClick={() => { setSplitMode('equal'); setShares({}); }}
                    className="text-xs text-purple-500 hover:text-purple-700">↺ Partes iguales</button>
                </div>
              )}
            </div>
          )}

          <button onClick={handleConfirm} disabled={!canConfirm}
            className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
            style={{ backgroundColor: 'var(--soi-teal)' }}>
            <Save size={16} />
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  );
}
