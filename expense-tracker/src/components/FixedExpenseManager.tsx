import { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Bell } from 'lucide-react';
import type { FixedExpenseTemplate } from '../types/fixedExpense';
import type { Category, User, PaymentMethod, Frequency } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS } from '../types/expense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';
import { ReminderDialog } from './ReminderDialog';

interface Props {
  templates: FixedExpenseTemplate[];
  onAdd: (t: Omit<FixedExpenseTemplate, 'id' | 'createdAt'>) => FixedExpenseTemplate;
  onUpdate: (id: string, t: Partial<FixedExpenseTemplate>) => void;
  onDelete: (id: string) => void;
  members: SpaceMember[];
}

const FREQ_LABELS: Record<Frequency, string> = {
  diario: 'Diario', semanal: 'Semanal', quincenal: 'Quincenal',
  mensual: 'Mensual', bimestral: 'Bimestral', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual',
};

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const EMPTY_FORM = {
  concept: '', expectedAmount: '', category: 'servicios' as Category,
  paidBy: '' as User, paymentMethod: 'tarjeta_debito' as PaymentMethod,
  frequency: 'mensual' as Frequency,
  dayOfMonth: '', dayOfWeek: '1', paymentMonth: '1',
  bank: '', cardLast4: '', notes: '', active: true,
};

function PaymentDayField({
  frequency, dayOfMonth, dayOfWeek, paymentMonth,
  onChange,
}: {
  frequency: Frequency;
  dayOfMonth: string;
  dayOfWeek: string;
  paymentMonth: string;
  onChange: (k: string, v: string) => void;
}) {
  if (frequency === 'diario') return null;

  const cls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300';

  if (frequency === 'semanal') {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1">Día de la semana</label>
        <select value={dayOfWeek} onChange={(e) => onChange('dayOfWeek', e.target.value)} className={cls}>
          {WEEK_DAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
        </select>
      </div>
    );
  }

  if (frequency === 'anual') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mes de pago</label>
          <select value={paymentMonth} onChange={(e) => onChange('paymentMonth', e.target.value)} className={cls}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Día del mes</label>
          <input
            type="number" min="1" max="31" value={dayOfMonth} placeholder="Ej: 15"
            onChange={(e) => onChange('dayOfMonth', e.target.value)} className={cls}
          />
        </div>
      </div>
    );
  }

  const maxDay = frequency === 'quincenal' ? 15 : 31;
  const label = frequency === 'quincenal'
    ? 'Primer día del ciclo (1-15)'
    : 'Día del mes';

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number" min="1" max={maxDay} value={dayOfMonth} placeholder={`Ej: ${frequency === 'quincenal' ? 1 : 5}`}
        onChange={(e) => onChange('dayOfMonth', e.target.value)} className={cls}
      />
    </div>
  );
}

function TemplateForm({
  initial, onSave, onCancel, members,
}: {
  initial?: Partial<typeof EMPTY_FORM>;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  members: SpaceMember[];
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.concept || !form.expectedAmount) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-teal-50 border border-teal-200 rounded-2xl p-4">
      <p className="text-sm font-bold text-teal-800">
        {initial?.concept ? '✏️ Editar gasto fijo' : '➕ Nuevo gasto fijo'}
      </p>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Concepto *</label>
        <input type="text" required value={form.concept} onChange={(e) => set('concept', e.target.value)}
          placeholder="Netflix, Renta, CFE..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monto esperado *</label>
          <input type="number" required min="0" step="0.01" value={form.expectedAmount}
            onChange={(e) => set('expectedAmount', e.target.value)} placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Frecuencia</label>
          <select value={form.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
            {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Payment day — adapts to frequency */}
      <PaymentDayField
        frequency={form.frequency}
        dayOfMonth={form.dayOfMonth}
        dayOfWeek={form.dayOfWeek}
        paymentMonth={form.paymentMonth}
        onChange={(k, v) => set(k, v)}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value as Category)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
          <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Quién paga</label>
        <div className="flex gap-1.5 flex-wrap">
          {members.map((m) => (
            <button key={m.id} type="button" onClick={() => set('paidBy', m.name)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                form.paidBy === m.name ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'
              }`}
              style={form.paidBy === m.name ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: MEMBER_COLORS[m.colorIndex], fontSize: '8px' }}>
                {m.name.slice(0, 1).toUpperCase()}
              </span>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Banco</label>
          <input type="text" value={form.bank} onChange={(e) => set('bank', e.target.value)} placeholder="BBVA..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tarjeta ···</label>
          <input type="text" maxLength={4} value={form.cardLast4}
            onChange={(e) => set('cardLast4', e.target.value.replace(/\D/g, ''))} placeholder="1234"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Notas</label>
        <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Observaciones..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit"
          className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-all">
          Guardar
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function FixedExpenseManager({ templates, onAdd, onUpdate, onDelete, members }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pendingReminder, setPendingReminder] = useState<FixedExpenseTemplate | null>(null);

  const handleAdd = (form: typeof EMPTY_FORM) => {
    const tpl = onAdd({
      concept: form.concept,
      expectedAmount: parseFloat(form.expectedAmount as string) || 0,
      category: form.category,
      paidBy: form.paidBy,
      paymentMethod: form.paymentMethod,
      frequency: form.frequency,
      dayOfMonth: form.dayOfMonth ? parseInt(form.dayOfMonth as string) : undefined,
      dayOfWeek: form.frequency === 'semanal' && form.dayOfWeek ? parseInt(form.dayOfWeek) : undefined,
      paymentMonth: form.frequency === 'anual' && form.paymentMonth ? parseInt(form.paymentMonth) : undefined,
      bank: form.bank || undefined,
      cardLast4: form.cardLast4 || undefined,
      notes: form.notes || undefined,
      active: true,
    });
    setShowForm(false);
    setPendingReminder(tpl);
  };

  const handleEdit = (id: string, form: typeof EMPTY_FORM) => {
    onUpdate(id, {
      concept: form.concept,
      expectedAmount: parseFloat(form.expectedAmount as string) || 0,
      category: form.category,
      paidBy: form.paidBy,
      paymentMethod: form.paymentMethod,
      frequency: form.frequency,
      dayOfMonth: form.dayOfMonth ? parseInt(form.dayOfMonth as string) : undefined,
      dayOfWeek: form.frequency === 'semanal' && form.dayOfWeek ? parseInt(form.dayOfWeek) : undefined,
      paymentMonth: form.frequency === 'anual' && form.paymentMonth ? parseInt(form.paymentMonth) : undefined,
      bank: form.bank || undefined,
      cardLast4: form.cardLast4 || undefined,
      notes: form.notes || undefined,
    });
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    if (confirmDel === id) { onDelete(id); setConfirmDel(null); }
    else { setConfirmDel(id); setTimeout(() => setConfirmDel(null), 3000); }
  };

  const active   = templates.filter((t) => t.active);
  const inactive = templates.filter((t) => !t.active);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800">Gastos fijos</h2>
            <p className="text-xs text-gray-400">{active.length} activos · {templates.length} total</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-all">
              <Plus size={16} /> Agregar
            </button>
          )}
        </div>

        {showForm && (
          <TemplateForm onSave={handleAdd} onCancel={() => setShowForm(false)} members={members} />
        )}

        {templates.length === 0 && !showForm && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-medium text-gray-600">Sin gastos fijos definidos</p>
            <p className="text-xs mt-1">Agrega tus gastos recurrentes (renta, suscripciones, servicios...)</p>
          </div>
        )}

        {[...active, ...inactive].map((tpl) => (
          <div key={tpl.id}>
            {editId === tpl.id ? (
              <TemplateForm
                initial={{
                  concept: tpl.concept, expectedAmount: String(tpl.expectedAmount),
                  category: tpl.category, paidBy: tpl.paidBy, paymentMethod: tpl.paymentMethod,
                  frequency: tpl.frequency,
                  dayOfMonth: tpl.dayOfMonth ? String(tpl.dayOfMonth) : '',
                  dayOfWeek: tpl.dayOfWeek ? String(tpl.dayOfWeek) : '1',
                  paymentMonth: tpl.paymentMonth ? String(tpl.paymentMonth) : '1',
                  bank: tpl.bank ?? '', cardLast4: tpl.cardLast4 ?? '', notes: tpl.notes ?? '',
                }}
                onSave={(form) => handleEdit(tpl.id, form)}
                onCancel={() => setEditId(null)}
                members={members}
              />
            ) : (
              <div className={`bg-white rounded-xl border p-3 shadow-sm transition-opacity ${!tpl.active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{tpl.concept}</p>
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                        {FREQ_LABELS[tpl.frequency]}
                      </span>
                      {tpl.reminderEnabled && (
                        <Bell size={12} className="text-teal-500" />
                      )}
                      {/* Payment day badge */}
                      {tpl.frequency === 'semanal' && tpl.dayOfWeek && (
                        <span className="text-xs text-gray-400">{WEEK_DAYS[tpl.dayOfWeek - 1]}</span>
                      )}
                      {tpl.frequency === 'anual' && tpl.paymentMonth && tpl.dayOfMonth && (
                        <span className="text-xs text-gray-400">
                          {tpl.dayOfMonth} {MONTHS[tpl.paymentMonth - 1]}
                        </span>
                      )}
                      {!['semanal','anual','diario'].includes(tpl.frequency) && tpl.dayOfMonth && (
                        <span className="text-xs text-gray-400">día {tpl.dayOfMonth}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-base font-bold text-gray-800">
                        ${tpl.expectedAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(CATEGORIES[tpl.category] as string).replace(/^[^ ]+ /, '')}
                      </span>
                      <span className="text-xs text-gray-400">{tpl.paidBy}</span>
                      {tpl.cardLast4 && <span className="text-xs text-gray-400">···{tpl.cardLast4}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setPendingReminder(tpl)}
                      className="p-1.5 text-gray-300 hover:text-teal-500 transition-colors"
                      title="Configurar recordatorio"
                    >
                      <Bell size={15} />
                    </button>
                    <button onClick={() => onUpdate(tpl.id, { active: !tpl.active })}
                      className="p-1.5 text-gray-400 hover:text-teal-500 transition-colors"
                      title={tpl.active ? 'Desactivar' : 'Activar'}>
                      {tpl.active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => setEditId(tpl.id)} className="p-1.5 text-gray-400 hover:text-teal-500 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(tpl.id)}
                      className={`p-1.5 transition-colors ${confirmDel === tpl.id ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {pendingReminder && (
        <ReminderDialog
          template={pendingReminder}
          onUpdate={onUpdate}
          onClose={() => setPendingReminder(null)}
        />
      )}
    </>
  );
}
