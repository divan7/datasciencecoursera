import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Expense, Category } from '../types/expense';
import { CATEGORIES } from '../types/expense';
import { ExpenseCard } from './ExpenseCard';
import { TicketGroup } from './TicketGroup';
import { ExpenseEditModal } from './ExpenseEditModal';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit?: (id: string, data: Partial<Expense>) => void;
  members: SpaceMember[];
  isLector?: boolean;
}

export function ExpenseList({ expenses, onDelete, onEdit, members, isLector = false }: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState<'all' | string>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | Category>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map((e) => e.date.slice(0, 7)));
    const current = format(new Date(), 'yyyy-MM');
    months.add(current);
    return Array.from(months).sort().reverse();
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (!e.date.startsWith(selectedMonth)) return false;
        if (filterUser !== 'all' && e.paidBy !== filterUser) return false;
        if (filterCategory !== 'all' && e.category !== filterCategory) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            e.concept.toLowerCase().includes(q) ||
            (e.store ?? '').toLowerCase().includes(q) ||
            (e.notes ?? '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, selectedMonth, filterUser, filterCategory, search]);

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  // Per-member totals for summary: ingresos - gastos = balance neto
  const memberTotals = useMemo(() => {
    return members.map((m) => {
      const mine = filtered.filter((e) => e.paidBy === m.name);
      const ingresos = mine.filter((e) => e.transactionType === 'ingreso').reduce((s, e) => s + e.amount, 0);
      const gastos = mine.filter((e) => (e.transactionType ?? 'gasto') !== 'ingreso').reduce((s, e) => s + e.amount, 0);
      return { member: m, total: ingresos - gastos };
    });
  }, [filtered, members]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filtered.forEach((e) => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const categoriesUsed = useMemo(() => {
    const cats = new Set(expenses.filter((e) => e.date.startsWith(selectedMonth)).map((e) => e.category));
    return Array.from(cats);
  }, [expenses, selectedMonth]);

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="relative">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300 appearance-none bg-white"
        >
          {availableMonths.map((m) => {
            const [y, mo] = m.split('-');
            const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
            return (
              <option key={m} value={m}>
                {format(date, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            );
          })}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
        <div className="grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${Math.min(members.length + 1, 4)}, 1fr)` }}>
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="font-bold text-gray-900 text-base">
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
          {memberTotals.slice(0, 3).map(({ member, total: mt }) => (
            <div key={member.id}>
              <p className="text-xs truncate" style={{ color: MEMBER_COLORS[member.colorIndex] }}>{member.name}</p>
              <p className="font-bold text-base" style={{ color: mt < 0 ? '#ef4444' : MEMBER_COLORS[member.colorIndex] }}>
                {mt < 0 ? '-' : ''}${Math.abs(mt).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar gastos..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {/* User filter */}
        <button
          onClick={() => setFilterUser('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${
            filterUser === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500'
          }`}
        >
          Todos
        </button>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setFilterUser(filterUser === m.name ? 'all' : m.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${
              filterUser === m.name ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'
            }`}
            style={filterUser === m.name ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}
          >
            {m.name}
          </button>
        ))}
        <div className="h-6 w-px bg-gray-200 self-center flex-shrink-0" />
        {categoriesUsed.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${
              filterCategory === cat ? 'bg-teal-700 text-white border-teal-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            {CATEGORIES[cat]}
          </button>
        ))}
      </div>

      {/* Expense groups */}
      {grouped.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p className="font-medium">No hay gastos registrados</p>
          <p className="text-sm mt-1">Usa el botón "Registrar" para agregar gastos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, dayExpenses]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-xs font-bold text-gray-700">
                  ${dayExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="space-y-2">
                {(() => {
                  // Group by ticketId; items without ticketId render individually
                  const ticketMap = new Map<string, Expense[]>();
                  const individual: Expense[] = [];
                  dayExpenses.forEach((e) => {
                    if (e.ticketId) {
                      const g = ticketMap.get(e.ticketId) ?? [];
                      g.push(e);
                      ticketMap.set(e.ticketId, g);
                    } else {
                      individual.push(e);
                    }
                  });

                  const elements: ReactNode[] = [];

                  // Ticket groups first (multi-item), then singles with same ticketId, then ungrouped
                  const handleEdit = isLector || !onEdit ? undefined : (id: string) => {
                    const exp = expenses.find((e) => e.id === id);
                    if (exp) setEditingExpense(exp);
                  };

                  ticketMap.forEach((items, tid) => {
                    if (items.length >= 2) {
                      elements.push(
                        <TicketGroup key={tid} expenses={items}
                          onDelete={isLector ? undefined : onDelete}
                          onEdit={handleEdit} />
                      );
                    } else {
                      individual.push(...items);
                    }
                  });

                  individual.forEach((expense) => {
                    elements.push(
                      <ExpenseCard key={expense.id} expense={expense}
                        onDelete={isLector ? undefined : onDelete}
                        onEdit={handleEdit} />
                    );
                  });

                  return elements;
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingExpense && onEdit && (
        <ExpenseEditModal
          expense={editingExpense}
          members={members}
          onSave={(id, data) => { onEdit(id, data); setEditingExpense(null); }}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </div>
  );
}
