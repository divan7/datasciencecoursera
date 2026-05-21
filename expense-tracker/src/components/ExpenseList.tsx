import { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Expense, Category } from '../types/expense';
import { CATEGORIES } from '../types/expense';
import { ExpenseCard } from './ExpenseCard';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  userName1: string;
  userName2: string;
}

export function ExpenseList({ expenses, onDelete, userName1, userName2 }: ExpenseListProps) {
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState<'all' | 'Ivan' | 'Esposa'>('all');
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
  const totalIvan = useMemo(() => filtered.filter((e) => e.paidBy === 'Ivan').reduce((s, e) => s + e.amount, 0), [filtered]);
  const totalEsposa = useMemo(() => filtered.filter((e) => e.paidBy === 'Esposa').reduce((s, e) => s + e.amount, 0), [filtered]);

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
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none bg-white"
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
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="font-bold text-gray-900 text-base">
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-400">{userName1}</p>
            <p className="font-bold text-blue-700 text-base">
              ${totalIvan.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-purple-400">{userName2}</p>
            <p className="font-bold text-purple-700 text-base">
              ${totalEsposa.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
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
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
        <button
          onClick={() => setFilterUser('Ivan')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${
            filterUser === 'Ivan' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500'
          }`}
        >
          {userName1}
        </button>
        <button
          onClick={() => setFilterUser('Esposa')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${
            filterUser === 'Esposa' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-500'
          }`}
        >
          {userName2}
        </button>
        <div className="h-6 w-px bg-gray-200 self-center flex-shrink-0" />
        {categoriesUsed.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${
              filterCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500'
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
                {dayExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onDelete={onDelete}
                    userName1={userName1}
                    userName2={userName2}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
