import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { FixedExpenseTemplate, MonthlyCheck, CheckStatus } from '../types/fixedExpense';
import type { Expense } from '../types/expense';
import {
  loadTemplates, saveTemplates, loadChecks, saveChecks,
  generateFixedId, isDueInMonth,
} from '../utils/fixedStorage';
import { fixedDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';

export function useFixedExpenses(_expenses: Expense[], spaceId: string) {
  const [templates, setTemplates] = useState<FixedExpenseTemplate[]>(() => loadTemplates(spaceId));
  const [checks, setChecks]       = useState<MonthlyCheck[]>(() => loadChecks(spaceId));

  useEffect(() => {
    if (!spaceId) return;

    // Fast path: load local cache immediately
    const localTemplates = loadTemplates(spaceId);
    const localChecks    = loadChecks(spaceId);
    setTemplates(localTemplates);
    setChecks(localChecks);

    if (!isSupabaseConfigured) return;

    // Templates — non-destructive merge (same pattern as expenses)
    fixedDb.listTemplates(spaceId).then((remote) => {
      const remoteIds = new Set(remote.map((t) => t.id));
      const localOnly = localTemplates.filter((t) => !remoteIds.has(t.id));
      // Re-upload templates that only exist locally
      if (localOnly.length > 0) {
        Promise.all(localOnly.map((t) => fixedDb.createTemplate(spaceId, t)))
          .catch((err) => console.error('Re-sync plantillas locales fallido:', err));
      }
      const merged = [...remote, ...localOnly];
      setTemplates(merged);
      saveTemplates(merged, spaceId);
    }).catch((err) => console.error('No se leyeron plantillas remotas, se mantienen las locales:', err));

    // Checks — status-aware merge: confirmado > omitido > pendiente
    fixedDb.listChecks(spaceId).then((remote) => {
      const STATUS_PRIORITY: Record<string, number> = { confirmado: 2, omitido: 1, pendiente: 0 };
      const mergeKey = (c: MonthlyCheck) => `${c.templateId}_${c.month}`;

      // Build a map keyed by template+month, keeping the "best" status across local and remote
      const byKey = new Map<string, MonthlyCheck>();
      const prefer = (a: MonthlyCheck, b: MonthlyCheck) =>
        (STATUS_PRIORITY[a.status] ?? 0) >= (STATUS_PRIORITY[b.status] ?? 0) ? a : b;

      for (const c of [...remote, ...localChecks]) {
        const key = mergeKey(c);
        byKey.set(key, byKey.has(key) ? prefer(byKey.get(key)!, c) : c);
      }
      const merged = Array.from(byKey.values());

      // Upload checks that "won" the merge but differ from remote (fix Supabase state)
      const remoteByKey = new Map(remote.map((c) => [mergeKey(c), c]));
      const toUpload = merged.filter((c) => {
        const rem = remoteByKey.get(mergeKey(c));
        if (!rem) return true; // not in remote at all
        // Different status OR different ID (local won by status priority) → fix remote
        return rem.status !== c.status || rem.id !== c.id;
      });
      const pendingOnly = toUpload.filter((c) => c.status === 'pendiente');
      const confirmedOrSkipped = toUpload.filter((c) => c.status !== 'pendiente');
      // New pendiente checks: insert only, never overwrite a confirmed row
      if (pendingOnly.length > 0) {
        fixedDb.insertChecksIfNew(spaceId, pendingOnly)
          .catch((err) => console.error('Re-sync checks pendientes fallido:', err));
      }
      // Confirmed/skipped local wins: push the update to remote
      if (confirmedOrSkipped.length > 0) {
        fixedDb.upsertChecks(spaceId, confirmedOrSkipped)
          .catch((err) => console.error('Re-sync checks confirmados fallido:', err));
      }

      setChecks(merged);
      saveChecks(merged, spaceId);
    }).catch((err) => console.error('No se leyeron checks remotos, se mantienen los locales:', err));

  }, [spaceId]);

  // ── Template CRUD ──────────────────────────────────────────────
  const addTemplate = useCallback((t: Omit<FixedExpenseTemplate, 'id' | 'createdAt'>) => {
    const tpl: FixedExpenseTemplate = {
      ...t,
      id: generateFixedId(),
      createdAt: format(new Date(), 'yyyy-MM-dd'),
    };
    setTemplates((prev) => {
      const updated = [tpl, ...prev];
      saveTemplates(updated, spaceId);
      return updated;
    });
    if (isSupabaseConfigured) {
      fixedDb.createTemplate(spaceId, tpl).catch(console.error);
    }
    return tpl;
  }, [spaceId]);

  const updateTemplate = useCallback((id: string, data: Partial<FixedExpenseTemplate>) => {
    setTemplates((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, ...data } : t);
      saveTemplates(updated, spaceId);
      if (isSupabaseConfigured) {
        const tpl = updated.find((t) => t.id === id);
        if (tpl) fixedDb.updateTemplate(tpl, spaceId).catch(console.error);
      }
      return updated;
    });
  }, [spaceId]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTemplates(updated, spaceId);
      return updated;
    });
    setChecks((prev) => {
      const updated = prev.filter((c) => c.templateId !== id);
      saveChecks(updated, spaceId);
      return updated;
    });
    if (isSupabaseConfigured) {
      fixedDb.deleteTemplate(id).catch(console.error);
    }
  }, [spaceId]);

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
      saveChecks(updated, spaceId);
      if (isSupabaseConfigured) {
        // Use insertChecksIfNew so we never overwrite a confirmed/skipped check in Supabase
        // that was created on another device but hasn't synced to local yet.
        fixedDb.insertChecksIfNew(spaceId, newChecks).catch(console.error);
      }
      return updated;
    });
  }, [templates, checks, spaceId]);

  const confirmCheck = useCallback((checkId: string, expenseId: string, actualAmount: number) => {
    setChecks((prev) => {
      const updated = prev.map((c) =>
        c.id === checkId
          ? { ...c, status: 'confirmado' as CheckStatus, expenseId, actualAmount, confirmedAt: new Date().toISOString() }
          : c
      );
      saveChecks(updated, spaceId);
      const check = updated.find((c) => c.id === checkId);
      if (isSupabaseConfigured && check) {
        fixedDb.updateCheck(check, spaceId).catch(console.error);
      }
      return updated;
    });
  }, [spaceId]);

  const skipCheck = useCallback((checkId: string, notes?: string) => {
    setChecks((prev) => {
      const updated = prev.map((c) =>
        c.id === checkId ? { ...c, status: 'omitido' as CheckStatus, notes, confirmedAt: new Date().toISOString() } : c
      );
      saveChecks(updated, spaceId);
      const check = updated.find((c) => c.id === checkId);
      if (isSupabaseConfigured && check) {
        fixedDb.updateCheck(check, spaceId).catch(console.error);
      }
      return updated;
    });
  }, [spaceId]);

  const resetCheck = useCallback((checkId: string) => {
    setChecks((prev) => {
      const updated = prev.map((c) =>
        c.id === checkId
          ? { ...c, status: 'pendiente' as CheckStatus, expenseId: undefined, actualAmount: undefined, confirmedAt: undefined }
          : c
      );
      saveChecks(updated, spaceId);
      const check = updated.find((c) => c.id === checkId);
      if (isSupabaseConfigured && check) {
        fixedDb.updateCheck(check, spaceId).catch(console.error);
      }
      return updated;
    });
  }, [spaceId]);

  // ── Auto-match ─────────────────────────────────────────────────
  // Returns true if the expense was matched & confirmed against an existing template
  const tryAutoMatch = useCallback((expense: Expense, month: string): boolean => {
    if ((expense.transactionType ?? 'gasto') !== 'gasto') return false;
    const monthChecks = checks.filter((c) => c.month === month && c.status === 'pendiente');
    if (monthChecks.length === 0) return false;

    for (const check of monthChecks) {
      const tpl = templates.find((t) => t.id === check.templateId);
      if (!tpl) continue;
      const conceptMatch = expense.concept.toLowerCase().includes(tpl.concept.toLowerCase()) ||
                           tpl.concept.toLowerCase().includes(expense.concept.toLowerCase());
      const categoryMatch = expense.category === tpl.category;
      const amountDiff = Math.abs(expense.amount - tpl.expectedAmount) / tpl.expectedAmount;
      const amountMatch = amountDiff <= 0.25;
      if ((conceptMatch && categoryMatch) || (categoryMatch && amountMatch && tpl.expectedAmount > 0)) {
        confirmCheck(check.id, expense.id, expense.amount);
        return true;
      }
    }
    return false;
  }, [checks, templates, confirmCheck]);

  const pendingCountCurrentMonth = useMemo(() => {
    const month = format(new Date(), 'yyyy-MM');
    return checks.filter((c) => c.month === month && c.status === 'pendiente').length;
  }, [checks]);

  // Creates a template and immediately creates a confirmed check for the expense's month.
  // Used when a fixed expense arrives via photo (already paid — no user confirmation needed).
  const addAndConfirmTemplate = useCallback(
    (t: Omit<FixedExpenseTemplate, 'id' | 'createdAt'>, expense: Expense): FixedExpenseTemplate => {
      const tpl: FixedExpenseTemplate = {
        ...t,
        id: generateFixedId(),
        createdAt: format(new Date(), 'yyyy-MM-dd'),
      };
      setTemplates((prev) => {
        const updated = [tpl, ...prev];
        saveTemplates(updated, spaceId);
        return updated;
      });
      if (isSupabaseConfigured) {
        fixedDb.createTemplate(spaceId, tpl).catch(console.error);
      }

      const month = expense.date.slice(0, 7);
      const check: MonthlyCheck = {
        id: generateFixedId(),
        month,
        templateId: tpl.id,
        status: 'confirmado',
        expenseId: expense.id,
        actualAmount: expense.amount,
        confirmedAt: new Date().toISOString(),
      };
      setChecks((prev) => {
        const updated = [...prev, check];
        saveChecks(updated, spaceId);
        if (isSupabaseConfigured) {
          fixedDb.upsertChecks(spaceId, [check]).catch(console.error);
        }
        return updated;
      });

      return tpl;
    },
    [spaceId]
  );

  return {
    templates,
    checks,
    addTemplate, updateTemplate, deleteTemplate,
    getChecksForMonth, ensureChecksForMonth,
    confirmCheck, skipCheck, resetCheck,
    tryAutoMatch,
    addAndConfirmTemplate,
    pendingCountCurrentMonth,
  };
}
