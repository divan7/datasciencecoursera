import { useState } from 'react';
import { X, Save, Bell } from 'lucide-react';
import type { Expense, Frequency } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS, FREQUENCIES } from '../types/expense';
import type { FixedExpenseTemplate } from '../types/fixedExpense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

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

  const selectCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white';

  const handleSave = () => {
    onSave({
      concept:            concept.trim(),
      expectedAmount:     parseFloat(amount) || expense.amount,
      category:           expense.category,
      paidBy,
      paymentMethod:      expense.paymentMethod,
      frequency,
      dayOfMonth:         ['mensual', 'bimestral', 'trimestral', 'semestral', 'quincenal', 'anual'].includes(frequency) && dayOfMonth
                            ? parseInt(dayOfMonth) : undefined,
      dayOfWeek:          frequency === 'semanal' ? parseInt(dayOfWeek) : undefined,
      paymentMonth:       frequency === 'anual' ? parseInt(paymentMonth) : undefined,
      reminderEnabled:    reminder,
      reminderDaysBefore: reminder ? parseInt(daysBefore) || 3 : undefined,
      fixedExpenseType:   'servicio',
      active:             true,
      bank:               expense.bank,
      cardLast4:          expense.cardLast4,
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
