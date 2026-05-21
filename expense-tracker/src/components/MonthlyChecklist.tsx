import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Circle, MinusCircle, ChevronDown, AlertTriangle, Link } from 'lucide-react';
import type { FixedExpenseTemplate, MonthlyCheck, CheckStatus } from '../types/fixedExpense';
import type { Expense } from '../types/expense';
import { CATEGORIES } from '../types/expense';
import { isDueInMonth } from '../utils/fixedStorage';

interface Props {
  templates: FixedExpenseTemplate[];
  checks: MonthlyCheck[];
  expenses: Expense[];
  onEnsureChecks: (month: string) => void;
  onConfirm: (checkId: string, expenseId: string, amount: number) => void;
  onSkip: (checkId: string, notes?: string) => void;
  onReset: (checkId: string) => void;
  onRegisterNow: (template: FixedExpenseTemplate) => void;
  userName1: string;
  userName2: string;
}

const STATUS_CONFIG: Record<CheckStatus, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  pendiente:  { icon: <Circle size={18} className="text-amber-400" />,       label: 'Pendiente',  color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  confirmado: { icon: <CheckCircle2 size={18} className="text-green-500" />, label: 'Confirmado', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  omitido:    { icon: <MinusCircle size={18} className="text-gray-400" />,   label: 'Omitido',    color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200'   },
};

function CheckItem({
  check, template, expense, onConfirmManual, onSkip, onReset, onRegisterNow, userName1, userName2,
}: {
  check: MonthlyCheck;
  template: FixedExpenseTemplate;
  expense?: Expense;
  onConfirmManual: (checkId: string) => void;
  onSkip: (checkId: string, notes?: string) => void;
  onReset: (checkId: string) => void;
  onRegisterNow: (t: FixedExpenseTemplate) => void;
  userName1: string;
  userName2: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [skipNote, setSkipNote] = useState('');
  const [showSkipInput, setShowSkipInput] = useState(false);
  const cfg = STATUS_CONFIG[check.status];

  const amountDiff = check.actualAmount !== undefined
    ? check.actualAmount - template.expectedAmount
    : null;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${cfg.bg}`}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm truncate">{template.concept}</p>
              <span className={`text-xs font-semibold flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm font-bold text-gray-800">
                ${template.expectedAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </span>
              {check.actualAmount !== undefined && check.actualAmount !== template.expectedAmount && (
                <span className={`text-xs font-medium ${amountDiff! > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  ({amountDiff! > 0 ? '+' : ''}{amountDiff!.toLocaleString('es-MX', { minimumFractionDigits: 0 })} vs esperado)
                </span>
              )}
              <span className="text-xs text-gray-400">
                {(CATEGORIES[template.category] as string).replace(/^[^ ]+ /, '')}
              </span>
              <span className="text-xs text-gray-400">
                {template.paidBy === 'Ivan' ? userName1 : userName2}
              </span>
              {template.dayOfMonth && check.status === 'pendiente' && (
                <span className="text-xs text-amber-600 font-medium">📅 día {template.dayOfMonth}</span>
              )}
            </div>

            {/* Linked expense */}
            {expense && (
              <div className="flex items-center gap-1 mt-1">
                <Link size={11} className="text-green-600" />
                <p className="text-xs text-green-700 truncate">
                  Vinculado: {expense.concept} — {format(parseISO(expense.date), 'd MMM', { locale: es })}
                </p>
              </div>
            )}
            {check.notes && (
              <p className="text-xs text-gray-400 mt-1 italic">"{check.notes}"</p>
            )}
          </div>

          <button onClick={() => setExpanded((v) => !v)} className="p-1 text-gray-300 hover:text-gray-500 flex-shrink-0">
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Actions */}
        {check.status === 'pendiente' && !showSkipInput && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onRegisterNow(template)}
              className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
            >
              ✏️ Registrar ahora
            </button>
            <button
              onClick={() => onConfirmManual(check.id)}
              className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-all"
            >
              ✅ Ya se pagó
            </button>
            <button
              onClick={() => setShowSkipInput(true)}
              className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs font-medium"
            >
              Omitir
            </button>
          </div>
        )}

        {showSkipInput && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={skipNote}
              onChange={(e) => setSkipNote(e.target.value)}
              placeholder="Razón (opcional)..."
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex gap-2">
              <button onClick={() => { onSkip(check.id, skipNote); setShowSkipInput(false); }}
                className="flex-1 py-1.5 bg-gray-500 text-white rounded-lg text-xs font-semibold">
                Confirmar omisión
              </button>
              <button onClick={() => setShowSkipInput(false)} className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {check.status !== 'pendiente' && (
          <button onClick={() => onReset(check.id)}
            className="mt-2 w-full py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ↺ Reabrir
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-2 bg-white/60 text-xs text-gray-500 space-y-0.5">
          {template.bank && <p>🏦 {template.bank}</p>}
          {template.cardLast4 && <p>💳 ···{template.cardLast4}</p>}
          {template.notes && <p>📝 {template.notes}</p>}
          {check.confirmedAt && (
            <p className="text-gray-300">
              {check.status === 'confirmado' ? 'Confirmado' : 'Omitido'}{' '}
              {format(new Date(check.confirmedAt), "d MMM HH:mm", { locale: es })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function MonthlyChecklist({
  templates, checks, expenses, onEnsureChecks,
  onConfirm, onSkip, onReset, onRegisterNow,
  userName1, userName2,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [filter, setFilter] = useState<'all' | CheckStatus>('all');

  // Ensure checks exist for this month whenever month or templates change
  useEffect(() => {
    onEnsureChecks(selectedMonth);
  }, [selectedMonth, templates.length]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    // Add months where we have checks
    checks.forEach((c) => months.add(c.month));
    // Add months where templates are due (current and next 2)
    const now = new Date();
    for (let i = -1; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.add(format(d, 'yyyy-MM'));
    }
    return Array.from(months).sort().reverse();
  }, [checks]);

  const monthChecks = useMemo(
    () => checks.filter((c) => c.month === selectedMonth),
    [checks, selectedMonth]
  );

  // Items = checks + any active templates due this month with no check yet
  const items = useMemo(() => {
    const activeTemplates = templates.filter((t) => t.active && isDueInMonth(t, selectedMonth));
    return activeTemplates
      .map((tpl) => ({
        tpl,
        check: monthChecks.find((c) => c.templateId === tpl.id),
      }))
      .filter(({ check }) => check !== undefined) as { tpl: FixedExpenseTemplate; check: MonthlyCheck }[];
  }, [templates, monthChecks, selectedMonth]);

  const filtered = filter === 'all' ? items : items.filter(({ check }) => check.status === filter);

  const stats = useMemo(() => ({
    total:      items.length,
    pendiente:  items.filter(({ check }) => check.status === 'pendiente').length,
    confirmado: items.filter(({ check }) => check.status === 'confirmado').length,
    omitido:    items.filter(({ check }) => check.status === 'omitido').length,
  }), [items]);

  const totalExpected   = useMemo(() => items.reduce((s, { tpl }) => s + tpl.expectedAmount, 0), [items]);
  const totalConfirmed  = useMemo(() => items.filter(({ check }) => check.status === 'confirmado').reduce((s, { check }) => s + (check.actualAmount ?? 0), 0), [items]);
  const completionPct   = stats.total > 0 ? Math.round(((stats.confirmado + stats.omitido) / stats.total) * 100) : 0;

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return format(new Date(parseInt(y), parseInt(m) - 1, 1), 'MMMM yyyy', { locale: es })
      .replace(/^\w/, (c) => c.toUpperCase());
  }, [selectedMonth]);

  // Manual confirm: link to the most recent expense of matching category
  const handleConfirmManual = (checkId: string) => {
    const check = checks.find((c) => c.id === checkId);
    if (!check) return;
    const tpl = templates.find((t) => t.id === check.templateId);
    if (!tpl) return;
    // Find best matching expense this month
    const candidate = expenses
      .filter((e) => e.date.startsWith(selectedMonth) && e.category === tpl.category && (e.transactionType ?? 'gasto') === 'gasto')
      .sort((a, b) => Math.abs(a.amount - tpl.expectedAmount) - Math.abs(b.amount - tpl.expectedAmount))[0];

    if (candidate) {
      onConfirm(checkId, candidate.id, candidate.amount);
    } else {
      onConfirm(checkId, 'manual', tpl.expectedAmount);
    }
  };

  if (templates.filter((t) => t.active).length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-2">📋</p>
        <p className="font-medium text-gray-600">Sin gastos fijos configurados</p>
        <p className="text-xs mt-1">Ve a Configuración → Gastos fijos para agregar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
      >
        {availableMonths.map((m) => {
          const [y, mo] = m.split('-');
          const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
          return (
            <option key={m} value={m}>
              {format(d, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          );
        })}
      </select>

      {/* Summary banner */}
      <div className={`rounded-2xl p-4 ${
        stats.pendiente > 0
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-green-50 border border-green-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-gray-800">{monthLabel}</p>
            <p className="text-xs text-gray-500">
              {stats.confirmado}/{stats.total} confirmados · {stats.pendiente} pendientes
              {stats.omitido > 0 && ` · ${stats.omitido} omitidos`}
            </p>
          </div>
          {stats.pendiente > 0 && (
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              <AlertTriangle size={14} />
              <span className="text-xs font-bold">{stats.pendiente}</span>
            </div>
          )}
          {stats.pendiente === 0 && (
            <span className="text-2xl">🎉</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-green-500 transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.confirmado / stats.total) * 100 : 0}%` }} />
            <div className="bg-gray-300 transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.omitido / stats.total) * 100 : 0}%` }} />
          </div>
        </div>
        <p className="text-right text-xs mt-1 text-gray-500">{completionPct}% completado</p>

        {/* Money totals */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/50">
          <div className="text-center">
            <p className="text-xs text-gray-400">Esperado</p>
            <p className="font-bold text-gray-800 text-sm">
              ${totalExpected.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Confirmado</p>
            <p className="font-bold text-green-700 text-sm">
              ${totalConfirmed.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          { id: 'all',       label: `Todos (${stats.total})` },
          { id: 'pendiente', label: `⏳ ${stats.pendiente}` },
          { id: 'confirmado',label: `✅ ${stats.confirmado}` },
          { id: 'omitido',   label: `— ${stats.omitido}` },
        ] as { id: typeof filter; label: string }[]).map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f.id ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Checklist */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No hay gastos en esta categoría</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ tpl, check }) => (
            <CheckItem
              key={check.id}
              check={check}
              template={tpl}
              expense={check.expenseId && check.expenseId !== 'manual'
                ? expenses.find((e) => e.id === check.expenseId)
                : undefined}
              onConfirmManual={handleConfirmManual}
              onSkip={onSkip}
              onReset={onReset}
              onRegisterNow={onRegisterNow}
              userName1={userName1}
              userName2={userName2}
            />
          ))}
        </div>
      )}
    </div>
  );
}
