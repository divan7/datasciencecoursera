import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { FixedExpenseTemplate, MonthlyCheck, CheckStatus } from '../types/fixedExpense';
import type { Expense } from '../types/expense';
import {
  loadTemplates, saveTemplates, loadChecks, saveChecks,
  generateFixedId, isDueInMonth,
} from '../utils/fixedStorage';

export function useFixedExpenses(_expenses: Expense[]) {
  const [templates, setTemplates] = useState<FixedExpenseTemplate[]>([]);
  const [checks, setChecks]       = useState<MonthlyCheck[]>([]);

  useEffect(() => {
    setTemplates(loadTemplates());
    setChecks(loadChecks());
  }, []);

  // ── Template CRUD ──────────────────────────────────────────────
  const addTemplate = useCallback((t: Omit<FixedExpenseTemplate, 'id' | 'createdAt'>) => {
    const tpl: FixedExpenseTemplate = {
      ...t,
      id: generateFixedId(),
      createdAt: format(new Date(), 'yyyy-MM-dd'),
    };
    setTemplates((prev) => {
      const updated = [tpl, ...prev];
      saveTemplates(updated);
      return updated;
    });
    return tpl;
  }, []);

  const updateTemplate = useCallback((id: string, data: Partial<FixedExpenseTemplate>) => {
    setTemplates((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, ...data } : t);
      saveTemplates(updated);
      return updated;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTemplates(updated);
      return updated;
    });
    setChecks((prev) => {
      const updated = prev.filter((c) => c.templateId !== id);
      saveChecks(updated);
      return updated;
    });
  }, []);

  // ── Check management ───────────────────────────────────────────
  const getChecksForMonth = useCallback(
    (month: string) => checks.filter((c) => c.month === month),
    [checks]
  );

  const ensureChecksForMonth = useCallback((month: string) => {
    const activeTemplates = templates.filter((t) => t.active && isDueInMonth(t, month));
    const existing = checks.filter((c) => c.month === month).map((c) => c.templateId);
    const missing = activeTemplates.filter((t) => !existing.includes(t.id));

    if (missing.length === 0) return;

    const newChecks: MonthlyCheck[] = missing.map((t) => ({
      id: generateFixedId(),
      month,
      templateId: t.id,
      status: 'pendiente',
    }));

    setChecks((prev) => {
      const updated = [...prev, ...newChecks];
      saveChecks(updated);
      return updated;
    });
  }, [templates, checks]);

  const updateCheck = useCallback((id: string, data: Partial<MonthlyCheck>) => {
    setChecks((prev) => {
      const updated = prev.map((c) => c.id === id ? { ...c, ...data } : c);
      saveChecks(updated);
      return updated;
    });
  }, []);

  const confirmCheck = useCallback((checkId: string, expenseId: string, actualAmount: number) => {
    setChecks((prev) => {
      const updated = prev.map((c) =>
        c.id === checkId
          ? { ...c, status: 'confirmado' as CheckStatus, expenseId, actualAmount, confirmedAt: new Date().toISOString() }
          : c
      );
      saveChecks(updated);
      return updated;
    });
  }, []);

  const skipCheck = useCallback((checkId: string, notes?: string) => {
    setChecks((prev) => {
      const updated = prev.map((c) =>
        c.id === checkId ? { ...c, status: 'omitido' as CheckStatus, notes, confirmedAt: new Date().toISOString() } : c
      );
      saveChecks(updated);
      return updated;
    });
  }, []);

  const resetCheck = useCallback((checkId: string) => {
    setChecks((prev) => {
      const updated = prev.map((c) =>
        c.id === checkId ? { ...c, status: 'pendiente' as CheckStatus, expenseId: undefined, actualAmount: undefined, confirmedAt: undefined } : c
      );
      saveChecks(updated);
      return updated;
    });
  }, []);

  // ── Auto-match: when an expense is added, try to link it ───────
  const tryAutoMatch = useCallback((expense: Expense, month: string) => {
    if ((expense.transactionType ?? 'gasto') !== 'gasto') return;

    const monthChecks = checks.filter((c) => c.month === month && c.status === 'pendiente');
    if (monthChecks.length === 0) return;

    for (const check of monthChecks) {
      const tpl = templates.find((t) => t.id === check.templateId);
      if (!tpl) continue;

      const conceptMatch = expense.concept.toLowerCase().includes(tpl.concept.toLowerCase()) ||
                           tpl.concept.toLowerCase().includes(expense.concept.toLowerCase());
      const categoryMatch = expense.category === tpl.category;
      const amountDiff = Math.abs(expense.amount - tpl.expectedAmount) / tpl.expectedAmount;
      const amountMatch = amountDiff <= 0.25; // ±25% tolerance

      if ((conceptMatch && categoryMatch) || (categoryMatch && amountMatch && tpl.expectedAmount > 0)) {
        confirmCheck(check.id, expense.id, expense.amount);
        return;
      }
    }
  }, [checks, templates, confirmCheck]);

  // ── Derived state ──────────────────────────────────────────────
  const pendingCountCurrentMonth = useMemo(() => {
    const month = format(new Date(), 'yyyy-MM');
    return checks.filter((c) => c.month === month && c.status === 'pendiente').length;
  }, [checks]);

  return {
    templates,
    checks,
    addTemplate, updateTemplate, deleteTemplate,
    getChecksForMonth, ensureChecksForMonth,
    updateCheck, confirmCheck, skipCheck, resetCheck,
    tryAutoMatch,
    pendingCountCurrentMonth,
  };
}
