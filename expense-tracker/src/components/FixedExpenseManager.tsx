import { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { FixedExpenseTemplate } from '../types/fixedExpense';
import type { Category, User, PaymentMethod, Frequency } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS } from '../types/expense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

interface Props {
  templates: FixedExpenseTemplate[];
  onAdd: (t: Omit<FixedExpenseTemplate, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, t: Partial<FixedExpenseTemplate>) => void;
  onDelete: (id: string) => void;
  members: SpaceMember[];
}

const FREQ_LABELS: Record<Frequency, string> = {
  diario: 'Diario', semanal: 'Semanal', quincenal: 'Quincenal',
  mensual: 'Mensual', bimestral: 'Bimestral', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual',
};

const EMPTY_FORM = {
  concept: '', expectedAmount: '', category: 'servicios' as Category,
  paidBy: '' as User, paymentMethod: 'tarjeta_debito' as PaymentMethod,
  frequency: 'mensual' as Frequency, dayOfMonth: '', bank: '', cardLast4: '',
  notes: '', active: true,
};

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
    <form onSubmit={handleSubmit} className="space-y-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <p className="text-sm font-bold text-blue-800">
        {initial?.concept ? '✏️ Editar gasto fijo' : '➕ Nuevo gasto fijo'}
      </p>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Concepto *</label>
        <input type="text" required value={form.concept} onChange={(e) => set('concept', e.target.value)}
          placeholder="Netflix, Renta, CFE..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monto esperado *</label>
          <input type="number" required min="0" step="0.01" value={form.expectedAmount}
            onChange={(e) => set('expectedAmount', e.target.value)} placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Día del mes</label>
          <input type="number" min="1" max="31" value={form.dayOfMonth}
            onChange={(e) => set('dayOfMonth', e.target.value)} placeholder="Ej: 5"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value as Category)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Frecuencia</label>
          <select value={form.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
          <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Banco</label>
          <input type="text" value={form.bank} onChange={(e) => set('bank', e.target.value)} placeholder="BBVA..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tarjeta ···</label>
          <input type="text" maxLength={4} value={form.cardLast4} onChange={(e) => set('cardLast4', e.target.value.replace(/\D/g, ''))}
            placeholder="1234" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Notas</label>
        <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Observaciones..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium">
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

  const handleAdd = (form: typeof EMPTY_FORM) => {
    onAdd({
      concept: form.concept,
      expectedAmount: parseFloat(form.expectedAmount as string) || 0,
      category: form.category,
      paidBy: form.paidBy,
      paymentMethod: form.paymentMethod,
      frequency: form.frequency,
      dayOfMonth: form.dayOfMonth ? parseInt(form.dayOfMonth as string) : undefined,
      bank: form.bank || undefined,
      cardLast4: form.cardLast4 || undefined,
      notes: form.notes || undefined,
      active: true,
    });
    setShowForm(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Gastos fijos</h2>
          <p className="text-xs text-gray-400">{active.length} activos · {templates.length} total</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all">
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
                frequency: tpl.frequency, dayOfMonth: tpl.dayOfMonth ? String(tpl.dayOfMonth) : '',
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
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {FREQ_LABELS[tpl.frequency]}
                    </span>
                    {tpl.dayOfMonth && (
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
                    <span className="text-xs text-gray-400">
                      {tpl.paidBy}
                    </span>
                    {tpl.cardLast4 && <span className="text-xs text-gray-400">···{tpl.cardLast4}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onUpdate(tpl.id, { active: !tpl.active })}
                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                    title={tpl.active ? 'Desactivar' : 'Activar'}>
                    {tpl.active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => setEditId(tpl.id)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
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
  );
}
