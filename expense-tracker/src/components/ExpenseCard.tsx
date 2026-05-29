import { useState } from 'react';
import { Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Expense } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS } from '../types/expense';

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  alimentacion: 'bg-green-100 text-green-700',
  transporte: 'bg-teal-100 text-teal-800',
  hogar: 'bg-yellow-100 text-yellow-700',
  salud: 'bg-red-100 text-red-700',
  educacion: 'bg-indigo-100 text-indigo-700',
  entretenimiento: 'bg-purple-100 text-purple-700',
  ropa: 'bg-pink-100 text-pink-700',
  servicios: 'bg-orange-100 text-orange-700',
  seguros: 'bg-gray-100 text-gray-700',
  suscripciones: 'bg-cyan-100 text-cyan-700',
  viajes: 'bg-teal-100 text-teal-700',
  restaurantes: 'bg-amber-100 text-amber-700',
  mascotas: 'bg-lime-100 text-lime-700',
  belleza: 'bg-fuchsia-100 text-fuchsia-700',
  inversiones: 'bg-emerald-100 text-emerald-700',
  deudas: 'bg-rose-100 text-rose-700',
  otro: 'bg-gray-100 text-gray-700',
};

export function ExpenseCard({ expense: e, onDelete, onEdit }: ExpenseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (!onDelete) return;
    if (confirmDelete) {
      onDelete(e.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${CATEGORY_COLORS[e.category] || 'bg-gray-100'}`}>
            {CATEGORIES[e.category]?.split(' ')[0]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{e.concept}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-400">
                    {format(parseISO(e.date), 'dd MMM', { locale: es })}
                  </span>
                  <span className="text-xs font-medium text-teal-700">{e.paidBy}</span>
                  {e.store && (
                    <span className="text-xs text-gray-400 truncate">📍 {e.store}</span>
                  )}
                  {e.expenseType === 'fijo' && (
                    <span className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full">fijo</span>
                  )}
                  {e.sharedExpense && (
                    <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">compartido</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {e.transactionType === 'ingreso' && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#f5ede6', color: '#a85a3a' }}>
                    +ingreso
                  </span>
                )}
                <span className={`text-base font-bold ${e.transactionType === 'ingreso' ? '' : 'text-gray-900'}`}
                  style={e.transactionType === 'ingreso' ? { color: '#cc7a55' } : {}}>
                  {e.transactionType === 'ingreso' ? '+' : ''}${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-600'}`}>
                  {CATEGORIES[e.category]?.replace(/^[^ ]+ /, '')}
                </span>
                <span className="text-xs text-gray-400">
                  {PAYMENT_METHODS[e.paymentMethod]?.replace(/^[^ ]+ /, '')}
                  {e.cardLast4 && ` ···${e.cardLast4}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {onEdit && (
                  <button
                    onClick={() => onEdit(e.id)}
                    className="p-1 text-gray-300 hover:text-teal-500 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className={`p-1 transition-colors ${confirmDelete ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                    title={confirmDelete ? 'Toca de nuevo para confirmar' : 'Eliminar'}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-50 px-3 py-2 bg-gray-50 text-xs text-gray-500 space-y-1">
          {e.bank && <p>🏦 Banco: <span className="text-gray-700 font-medium">{e.bank}</span></p>}
          {e.installments && <p>📅 MSI: <span className="text-gray-700 font-medium">{e.installments} meses</span></p>}
          {e.frequency && <p>🔄 Frecuencia: <span className="text-gray-700 font-medium capitalize">{e.frequency}</span></p>}
          {e.isReimbursable && <p>💰 Reembolsable</p>}
          {e.isTaxDeductible && <p>🧾 Deducible de impuestos</p>}
          {e.invoiceRequested && <p>📋 Factura solicitada</p>}
          {e.notes && <p>📝 {e.notes}</p>}
          {e.receiptImageBase64 && (
            <details>
              <summary className="cursor-pointer text-teal-600 font-medium">Ver ticket</summary>
              <img
                src={`data:image/jpeg;base64,${e.receiptImageBase64}`}
                alt="Ticket"
                className="mt-2 max-w-full rounded-lg border"
              />
            </details>
          )}
          <p className="text-gray-300 text-xs pt-1">
            Registrado {format(new Date(e.createdAt), "dd/MM/yy HH:mm")}
          </p>
        </div>
      )}
    </div>
  );
}
