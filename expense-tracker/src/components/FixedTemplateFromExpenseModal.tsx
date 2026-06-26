import { useState } from 'react';
import { X, Save, Bell, Users, CalendarX } from 'lucide-react';
import type { Expense, Frequency } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS, FREQUENCIES } from '../types/expense';
import type { FixedExpenseTemplate, DefaultSplit, FixedExpenseType, CreditType } from '../types/fixedExpense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

type SplitMode = 'equal' | 'percent' | 'amount';

interface Props {
  expense: Expense;
  members: SpaceMember[];
  onSave: (tpl: Omit<FixedExpenseTemplate, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function FixedTemplateFromExpenseModal({ expense, members, onSave, onClose }: Props) {
  const [concept, setConcept]   = useState(expense.concept);
  const [amount, setAmount]     = useState(String(expense.amount));
  const [paidBy, setPaidBy]     = useState(expense.paidBy);
  const [frequency, setFreq]    = useState<Frequency>('mensual');
  const [dayOfMonth, setDom]    = useState('');
  const [dayOfWeek, setDow]     = useState('1');
  const [paymentMonth, setPm]   = useState('1');
  const [reminder, setReminder] = useState(false);
  const [daysBefore, setDaysBefore] = useState('3');
  const [endsAt, setEndsAt]     = useState('');
  // Fixed expense type
  const [fixedExpenseType, setFixedExpenseType] = useState<FixedExpenseType>('servicio');
  const [creditType, setCreditType]             = useState<CreditType>('tarjeta_credito');
  const [cutDay, setCutDay]                     = useState('');
  const [paymentDueDays, setPaymentDueDays]     = useState('20');
  // Split
  const [splitEnabled, setSplitEnabled]   = useState(false);
  const [splitMode, setSplitMode]         = useState<SplitMode>('equal');
  const [splitParticipants, setParticipants] = useState<string[]>([]);
  const [splitShares, setShares]          = useState<Record<string, number>>({});

  const memberColor = (name: string) => {
    const m = members.find((mem) => mem.name === name);
    return m ? MEMBER_COLORS[m.colorIndex] : '#9ca3af';
  };

  const buildDefaultSplit = (): DefaultSplit | undefined => {
    if (!splitEnabled || splitParticipants.length === 0) return undefined;
    return {
      mode: splitMode,
      entries: splitParticipants.map((name) => ({ name, value: splitShares[name] ?? 0 })),
    };
  };

  const selectCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white';

  const isCreditCardType = fixedExpenseType === 'credito' && creditType === 'tarjeta_credito';

  const dueDatePreview = (() => {
    if (!isCreditCardType || !cutDay) return null;
    let day = parseInt(cutDay) + parseInt(paymentDueDays || '20');
    let monthOffset = 0;
    while (day > 30) { day -= 30; monthOffset++; }
    const label = monthOffset === 0 ? 'del mismo mes del corte'
      : monthOffset === 1 ? 'del mes siguiente al corte'
      : `de ${monthOffset} meses después del corte`;
    return `📅 Fecha límite: día ${day}${monthOffset > 0 ? ' (aprox.)' : ''} ${label}`;
  })();

  const handleSave = () => {
    onSave({
      concept:                  concept.trim(),
      expectedAmount:           parseFloat(amount) || expense.amount,
      category:                 expense.category,
      paidBy,
      paymentMethod:            expense.paymentMethod,
      frequency,
      dayOfMonth:               ['mensual', 'bimestral', 'trimestral', 'semestral', 'quincenal', 'anual'].includes(frequency) && dayOfMonth
                                  ? parseInt(dayOfMonth) : undefined,
      dayOfWeek:                frequency === 'semanal' ? parseInt(dayOfWeek) : undefined,
      paymentMonth:             frequency === 'anual' ? parseInt(paymentMonth) : undefined,
      reminderEnabled:          reminder,
      reminderDaysBefore:       reminder ? parseInt(daysBefore) || 3 : undefined,
      fixedExpenseType,
      creditType:               fixedExpenseType === 'credito' ? creditType : undefined,
      isCreditCard:             isCreditCardType,
      cutDay:                   isCreditCardType && cutDay ? parseInt(cutDay) : undefined,
      paymentDueDaysAfterCut:   isCreditCardType ? parseInt(paymentDueDays) || 20 : undefined,
      active:                   true,
      bank:                     expense.bank,
      cardLast4:                expense.cardLast4,
      endsAt:                   endsAt || undefined,
      defaultSplit:             buildDefaultSplit(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">🔄 Configurar como gasto fijo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Define la recurrencia para este gasto</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 pb-8">
          {/* Info chip showing the saved expense */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <span className="text-lg">{CATEGORIES[expense.category]?.split(' ')[0]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{expense.concept}</p>
              <p className="text-xs text-teal-600">${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} · {CATEGORIES[expense.category]?.replace(/^[^ ]+ /, '')}</p>
            </div>
          </div>

          {/* Concept — editable in case user wants to adjust */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Nombre del gasto fijo</label>
            <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>

          {/* Expected amount */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Monto esperado</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-6 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
          </div>

          {/* Paid by */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Quién paga</label>
            <div className="flex gap-1.5 flex-wrap">
              {members.map((m) => (
                <button key={m.id} type="button" onClick={() => setPaidBy(m.name)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    paidBy === m.name ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'
                  }`}
                  style={paidBy === m.name ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: MEMBER_COLORS[m.colorIndex], fontSize: '8px' }}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Fixed expense type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tipo de gasto fijo</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setFixedExpenseType('servicio')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  fixedExpenseType === 'servicio'
                    ? 'border-teal-400 bg-teal-50 text-teal-800'
                    : 'border-gray-200 bg-white text-gray-400'
                }`}>
                📋 Servicio u otro
              </button>
              <button type="button" onClick={() => setFixedExpenseType('credito')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  fixedExpenseType === 'credito'
                    ? 'border-orange-400 bg-orange-50 text-orange-800'
                    : 'border-gray-200 bg-white text-gray-400'
                }`}>
                💳 Pago de crédito
              </button>
            </div>
          </div>

          {/* Credit type (when credito) */}
          {fixedExpenseType === 'credito' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tipo de crédito</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'tarjeta_credito', label: '💳 Tarjeta de crédito' },
                  { value: 'credito_automotriz', label: '🚗 Automotriz' },
                  { value: 'credito_hipotecario', label: '🏠 Hipotecario' },
                  { value: 'otro_credito', label: '💼 Otro crédito' },
                ] as { value: CreditType; label: string }[]).map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setCreditType(opt.value)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-left leading-tight transition-all ${
                      creditType === opt.value
                        ? 'border-orange-400 bg-orange-50 text-orange-800'
                        : 'border-gray-200 bg-white text-gray-400'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Credit card fields */}
          {isCreditCardType && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-orange-800">💳 Datos de la tarjeta</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Día de corte</label>
                  <input type="number" min="1" max="31" value={cutDay} onChange={(e) => setCutDay(e.target.value)}
                    placeholder="Ej: 15"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Días límite pago</label>
                  <input type="number" min="1" max="30" value={paymentDueDays} onChange={(e) => setPaymentDueDays(e.target.value)}
                    placeholder="20"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              {dueDatePreview && (
                <p className="text-xs text-orange-600">{dueDatePreview}</p>
              )}
            </div>
          )}

          {/* Frequency */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Frecuencia</label>
            <select value={frequency} onChange={(e) => setFreq(e.target.value as Frequency)} className={selectCls}>
              {Object.entries(FREQUENCIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Payment day — varies by frequency */}
          {frequency === 'semanal' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Día de la semana</label>
              <select value={dayOfWeek} onChange={(e) => setDow(e.target.value)} className={selectCls}>
                {WEEK_DAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
              </select>
            </div>
          )}

          {frequency === 'anual' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Mes</label>
                <select value={paymentMonth} onChange={(e) => setPm(e.target.value)} className={selectCls}>
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Día</label>
                <input type="number" min="1" max="31" value={dayOfMonth} placeholder="ej. 15"
                  onChange={(e) => setDom(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
            </div>
          )}

          {!['diario', 'semanal', 'anual'].includes(frequency) && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                {frequency === 'quincenal' ? 'Primera quincena (día)' : 'Día de pago'}
              </label>
              <input type="number" min="1" max="31" value={dayOfMonth} placeholder="ej. 5"
                onChange={(e) => setDom(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
          )}

          {/* Reminder */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)}
                className="w-4 h-4 accent-teal-600" />
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Bell size={14} className="text-teal-500" />
                Activar recordatorio
              </span>
            </label>
            {reminder && (
              <div className="flex items-center gap-2 pl-6">
                <span className="text-xs text-gray-500">Avisar con</span>
                <input type="number" min="1" max="30" value={daysBefore}
                  onChange={(e) => setDaysBefore(e.target.value)}
                  className="w-14 text-center px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-300" />
                <span className="text-xs text-gray-500">días de anticipación</span>
              </div>
            )}
          </div>

          {/* ── Fecha de fin ── */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <CalendarX size={13} className="text-gray-400" />
              Fecha de finalización (opcional)
            </label>
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white" />
            {endsAt && (
              <p className="text-xs text-amber-600">
                ⏳ Dejará de aparecer después de {new Date(endsAt + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* ── División por defecto ── */}
          {members.length > 1 && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-3">
              <button type="button"
                onClick={() => { setSplitEnabled((v) => !v); setParticipants([]); setShares({}); }}
                className="flex items-center gap-2 text-xs font-semibold text-purple-700">
                <Users size={13} />
                {splitEnabled ? '✓ División guardada' : 'Guardar división por defecto'}
              </button>

              {splitEnabled && (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { value: 'equal', label: '÷ Iguales' },
                      { value: 'percent', label: '% Porcentaje' },
                      { value: 'amount', label: '$ Monto' },
                    ] as { value: SplitMode; label: string }[]).map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => { setSplitMode(opt.value); setShares({}); }}
                        className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                          splitMode === opt.value
                            ? 'border-purple-500 bg-purple-100 text-purple-800'
                            : 'border-purple-200 bg-white text-gray-500'
                        }`}>{opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {members.filter((m) => m.name !== paidBy).map((m) => {
                      const active = splitParticipants.includes(m.name);
                      return (
                        <button key={m.id} type="button"
                          onClick={() => {
                            setParticipants((p) => active ? p.filter((n) => n !== m.name) : [...p, m.name]);
                            if (active) setShares((s) => { const n = { ...s }; delete n[m.name]; return n; });
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            active ? 'text-white border-transparent' : 'border-purple-200 text-gray-500 bg-white'
                          }`}
                          style={active ? { backgroundColor: memberColor(m.name) } : {}}>
                          {active ? '✓ ' : '+ '}{m.name}
                        </button>
                      );
                    })}
                  </div>

                  {splitParticipants.length > 0 && splitMode !== 'equal' && (
                    <div className="space-y-1.5">
                      {splitParticipants.map((name) => (
                        <div key={name} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-purple-100">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0"
                            style={{ backgroundColor: memberColor(name) }}>
                            {name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="flex-1 text-xs text-gray-700 truncate">{name}</span>
                          <input type="number" inputMode="decimal"
                            value={splitShares[name] ?? ''}
                            onChange={(e) => setShares((s) => ({ ...s, [name]: parseFloat(e.target.value) || 0 }))}
                            placeholder={splitMode === 'percent' ? '%' : '$'}
                            className="w-16 text-xs text-right border border-purple-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Payment method info (read-only) */}
          <div className="flex gap-2 text-xs text-gray-400 pb-2">
            <span>Categoría: {CATEGORIES[expense.category]?.replace(/^[^ ]+ /, '')}</span>
            <span>·</span>
            <span>Pago: {PAYMENT_METHODS[expense.paymentMethod]?.replace(/^[^ ]+ /, '')}</span>
          </div>

          <button onClick={handleSave} disabled={!concept.trim()}
            className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
            style={{ backgroundColor: 'var(--soi-teal)' }}>
            <Save size={16} />
            Guardar gasto fijo
          </button>
        </div>
      </div>
    </div>
  );
}
