import { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Bell } from 'lucide-react';
import type { FixedExpenseTemplate, FixedExpenseType, CreditType } from '../types/fixedExpense';
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

const CREDIT_TYPE_OPTIONS: { value: CreditType; label: string; icon: string }[] = [
  { value: 'tarjeta_credito',     label: 'Tarjeta de crédito',        icon: '💳' },
  { value: 'credito_automotriz',  label: 'Crédito automotriz',        icon: '🚗' },
  { value: 'credito_hipotecario', label: 'Crédito hipotecario',       icon: '🏠' },
  { value: 'otro_credito',        label: 'Otro compromiso financiero', icon: '💼' },
];

const CREDIT_TYPE_LABEL: Record<CreditType, string> = {
  tarjeta_credito:     '💳 Tarjeta',
  credito_automotriz:  '🚗 Automotriz',
  credito_hipotecario: '🏠 Hipotecario',
  otro_credito:        '💼 Crédito',
};

const EMPTY_FORM = {
  concept: '', expectedAmount: '', category: 'servicios' as Category,
  paidBy: '' as User, paymentMethod: 'tarjeta_credito' as PaymentMethod,
  frequency: 'mensual' as Frequency,
  dayOfMonth: '', dayOfWeek: '1', paymentMonth: '1',
  bank: '', cardLast4: '', notes: '', active: true,
  isCreditCard: false, cutDay: '', paymentDueDaysAfterCut: '20', minimumPayment: '',
  fixedExpenseType: 'servicio' as FixedExpenseType,
  creditType: 'tarjeta_credito' as CreditType,
  variableAmount: false,
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

  const isCreditCard = form.fixedExpenseType === 'credito' && form.creditType === 'tarjeta_credito';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.concept || !form.expectedAmount) return;
    onSave({ ...form, isCreditCard });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-teal-50 border border-teal-200 rounded-2xl p-4">
      <p className="text-sm font-bold text-teal-800">
        {initial?.concept ? '✏️ Editar gasto fijo' : '➕ Nuevo gasto fijo'}
      </p>

      {/* ── Clasificación ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Clasificación</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('fixedExpenseType', 'credito')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all text-left ${
              form.fixedExpenseType === 'credito'
                ? 'border-orange-400 bg-orange-50 text-orange-800'
                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
            }`}
          >
            💳 Pago de crédito
          </button>
          <button
            type="button"
            onClick={() => set('fixedExpenseType', 'servicio')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all text-left ${
              form.fixedExpenseType === 'servicio'
                ? 'border-teal-400 bg-teal-50 text-teal-800'
                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
            }`}
          >
            📋 Servicio u otro
          </button>
        </div>
      </div>

      {/* ── Tipo de crédito ── */}
      {form.fixedExpenseType === 'credito' && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo de crédito</p>
          <div className="grid grid-cols-2 gap-2">
            {CREDIT_TYPE_OPTIONS.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => set('creditType', value)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-left leading-tight ${
                  form.creditType === value
                    ? 'border-orange-400 bg-orange-50 text-orange-800'
                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">Concepto *</label>
        <input type="text" required value={form.concept} onChange={(e) => set('concept', e.target.value)}
          placeholder="Netflix, Renta, CFE..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            {form.variableAmount ? 'Monto estimado' : 'Monto esperado'} *
          </label>
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

      {/* Variable amount toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={form.variableAmount}
          onChange={(e) => set('variableAmount', e.target.checked)}
          className="w-4 h-4 accent-teal-600" />
        <span className="text-sm text-gray-700 font-medium">Monto variable</span>
        <span className="text-xs text-gray-400">(CFE, tarjeta, agua…)</span>
      </label>
      {form.variableAmount && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 -mt-1">
          💡 El estimado es solo de referencia. Al confirmar el pago te pedirá el monto real.
        </p>
      )}

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

      {/* Credit card specific fields — only when tarjeta_credito is selected */}
      {isCreditCard && (
        <div className="space-y-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-orange-800">💳 Datos de la tarjeta</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Día de corte</label>
              <input type="number" min="1" max="31" value={form.cutDay}
                onChange={(e) => set('cutDay', e.target.value)} placeholder="Ej: 15"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Días límite de pago</label>
              <input type="number" min="1" max="30" value={form.paymentDueDaysAfterCut}
                onChange={(e) => set('paymentDueDaysAfterCut', e.target.value)} placeholder="20"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pago mínimo (opcional)</label>
            <input type="number" min="0" step="0.01" value={form.minimumPayment}
              onChange={(e) => set('minimumPayment', e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          {form.cutDay && (
            <p className="text-xs text-orange-600">
              📅 Fecha límite de pago: día {Math.min(parseInt(form.cutDay) + parseInt(form.paymentDueDaysAfterCut || '20'), 31)} del mes siguiente al corte
            </p>
          )}
        </div>
      )}

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

  const formToTemplate = (form: typeof EMPTY_FORM) => {
    const isCC = form.fixedExpenseType === 'credito' && form.creditType === 'tarjeta_credito';
    return {
      concept: form.concept,
      expectedAmount: parseFloat(form.expectedAmount as string) || 0,
      category: form.category,
      paidBy: form.paidBy,
      paymentMethod: form.paymentMethod,
      frequency: form.frequency,
      dayOfMonth: !isCC && form.dayOfMonth ? parseInt(form.dayOfMonth as string) : undefined,
      dayOfWeek: form.frequency === 'semanal' && form.dayOfWeek ? parseInt(form.dayOfWeek) : undefined,
      paymentMonth: form.frequency === 'anual' && form.paymentMonth ? parseInt(form.paymentMonth) : undefined,
      bank: form.bank || undefined,
      cardLast4: form.cardLast4 || undefined,
      notes: form.notes || undefined,
      fixedExpenseType: form.fixedExpenseType,
      creditType: form.fixedExpenseType === 'credito' ? form.creditType : undefined,
      variableAmount: form.variableAmount || undefined,
      isCreditCard: isCC || undefined,
      cutDay: isCC && form.cutDay ? parseInt(form.cutDay as string) : undefined,
      paymentDueDaysAfterCut: isCC && form.paymentDueDaysAfterCut ? parseInt(form.paymentDueDaysAfterCut as string) : undefined,
      minimumPayment: isCC && form.minimumPayment ? parseFloat(form.minimumPayment as string) : undefined,
    };
  };

  const handleAdd = (form: typeof EMPTY_FORM) => {
    const tpl = onAdd({ ...formToTemplate(form), active: true });
    setShowForm(false);
    setPendingReminder(tpl);
  };

  const handleEdit = (id: string, form: typeof EMPTY_FORM) => {
    onUpdate(id, formToTemplate(form));
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    if (confirmDel === id) { onDelete(id); setConfirmDel(null); }
    else { setConfirmDel(id); setTimeout(() => setConfirmDel(null), 3000); }
  };

  const active   = templates.filter((t) => t.active);
  const inactive = templates.filter((t) => !t.active);

  const getFixedType = (t: FixedExpenseTemplate) =>
    t.fixedExpenseType ?? (t.isCreditCard ? 'credito' : 'servicio');

  const renderTemplate = (tpl: FixedExpenseTemplate) => (
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
            isCreditCard: tpl.isCreditCard ?? false,
            cutDay: tpl.cutDay ? String(tpl.cutDay) : '',
            paymentDueDaysAfterCut: tpl.paymentDueDaysAfterCut ? String(tpl.paymentDueDaysAfterCut) : '20',
            minimumPayment: tpl.minimumPayment ? String(tpl.minimumPayment) : '',
            fixedExpenseType: tpl.fixedExpenseType ?? (tpl.isCreditCard ? 'credito' : 'servicio'),
            creditType: tpl.creditType ?? (tpl.isCreditCard ? 'tarjeta_credito' : 'tarjeta_credito'),
            variableAmount: tpl.variableAmount ?? false,
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
                {tpl.creditType && (
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                    {CREDIT_TYPE_LABEL[tpl.creditType]}
                  </span>
                )}
                {tpl.variableAmount && (
                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">variable</span>
                )}
                {tpl.reminderEnabled && <Bell size={12} className="text-teal-500" />}
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
                {tpl.minimumPayment && (
                  <span className="text-xs text-orange-500">mín ${tpl.minimumPayment.toLocaleString('es-MX')}</span>
                )}
                <span className="text-xs text-gray-400">
                  {((CATEGORIES[tpl.category] as string) ?? tpl.category ?? '').replace(/^[^ ]+ /, '')}
                </span>
                <span className="text-xs text-gray-400">{tpl.paidBy}</span>
                {tpl.cardLast4 && <span className="text-xs text-gray-400">···{tpl.cardLast4}</span>}
              </div>
              {tpl.isCreditCard && tpl.cutDay && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-orange-600">✂️ Corte día {tpl.cutDay}</span>
                  <span className="text-xs text-orange-500">· Límite día ~{Math.min(tpl.cutDay + (tpl.paymentDueDaysAfterCut ?? 20), 31)}</span>
                </div>
              )}
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
  );

  const allTpls = [...active, ...inactive];
  const creditTpls  = allTpls.filter((t) => getFixedType(t) === 'credito');
  const serviceTpls = allTpls.filter((t) => getFixedType(t) === 'servicio');

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

        {/* ── Pagos de créditos ── */}
        {creditTpls.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">💳 Pagos de créditos</span>
              <span className="flex-1 h-px bg-orange-100" />
              <span className="text-xs text-orange-400">{creditTpls.filter((t) => t.active).length} activos</span>
            </div>
            {creditTpls.map(renderTemplate)}
          </>
        )}

        {/* ── Servicios, colegiatura u otro ── */}
        {serviceTpls.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">📋 Servicios, colegiatura u otro</span>
              <span className="flex-1 h-px bg-teal-100" />
              <span className="text-xs text-teal-400">{serviceTpls.filter((t) => t.active).length} activos</span>
            </div>
            {serviceTpls.map(renderTemplate)}
          </>
        )}
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
