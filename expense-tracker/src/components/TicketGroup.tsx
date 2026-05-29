import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Expense } from '../types/expense';
import { ExpenseCard } from './ExpenseCard';

interface TicketGroupProps {
  expenses: Expense[];
  onDelete?: (id: string) => void;
}

export function TicketGroup({ expenses, onDelete }: TicketGroupProps) {
  const [expanded, setExpanded] = useState(false);

  if (expenses.length === 0) return null;

  const first = expenses[0];
  const store = first.store ?? 'Ticket';
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const date = first.date;
  const paidBy = first.paidBy;

  return (
    <div className="bg-white rounded-xl border border-teal-100 shadow-sm overflow-hidden">
      {/* Group header — tap to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-teal-50 transition-colors"
      >
        {/* Receipt icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-50 text-xl">
          🧾
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{store}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400">
                  {format(parseISO(date), 'dd MMM', { locale: es })}
                </span>
                <span className="text-xs font-medium text-teal-700">{paidBy}</span>
                <span className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full border border-teal-100">
                  {expenses.length} artículos
                </span>
              </div>
              {first.ticketNotes && (
                <p className="text-xs text-gray-400 mt-1 italic truncate">{first.ticketNotes}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-base font-bold text-gray-900">
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </div>
        </div>
      </button>

      {/* Individual items — shown when expanded */}
      {expanded && (
        <div className="border-t border-teal-50 divide-y divide-gray-50">
          {expenses.map((exp) => (
            <div key={exp.id} className="px-2 py-1">
              <ExpenseCard expense={exp} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
