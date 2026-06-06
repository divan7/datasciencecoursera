import { useState, useEffect, useCallback, useRef } from 'react';
import type { Expense } from '../types/expense';
import { loadExpenses, saveExpenses, generateId } from '../utils/storage';
import { expensesDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';

export function useExpenses(spaceId: string) {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    spaceId ? loadExpenses(spaceId) : []
  );
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const clearErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reportSyncError = useCallback((msg: string) => {
    setCloudSyncError(msg);
    if (clearErrorTimer.current) clearTimeout(clearErrorTimer.current);
    clearErrorTimer.current = setTimeout(() => setCloudSyncError(null), 8000);
  }, []);

  const clearCloudSyncError = useCallback(() => {
    if (clearErrorTimer.current) clearTimeout(clearErrorTimer.current);
    setCloudSyncError(null);
  }, []);

  useEffect(() => {
    if (!spaceId) return;
    // Fast: local cache
    const local = loadExpenses(spaceId);
    setExpenses(local);

    // Slow: sync from Supabase — NON-DESTRUCTIVE merge.
    // Never overwrite local data with an empty/partial remote result, and
    // re-upload any local-only expenses that never reached the cloud.
    if (isSupabaseConfigured) {
      expensesDb.list(spaceId).then((remote) => {
        const remoteIds = new Set(remote.map((e) => e.id));
        const localOnly = local.filter((e) => !remoteIds.has(e.id));

        // Recover/back up local-only expenses to Supabase
        if (localOnly.length > 0) {
          expensesDb.bulkCreate(spaceId, localOnly)
            .catch((err) => console.error('No se pudieron re-sincronizar gastos locales:', err));
        }

        // Union by id: keep everything (remote + local-only)
        const merged = [...remote, ...localOnly]
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
        setExpenses(merged);
        saveExpenses(merged, spaceId);
      }).catch((err) => {
        // On any failure, keep the local data we already showed
        console.error('No se pudo leer gastos remotos, se mantienen los locales:', err);
      });
    }
  }, [spaceId]);

  const addExpense = useCallback((data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const expense: Expense = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    setExpenses((prev) => {
      const updated = [expense, ...prev];
      saveExpenses(updated, spaceId);
      return updated;
    });
    if (isSupabaseConfigured) {
      expensesDb.create(spaceId, expense).catch((err) => {
        console.error('Error al guardar gasto en la nube:', err);
        reportSyncError('No se pudo guardar en la nube. El gasto se guardó localmente y se sincronizará cuando la conexión se restablezca.');
      });
    }
    return expense;
  }, [spaceId, reportSyncError]);

  const updateExpense = useCallback((id: string, data: Partial<Expense>) => {
    setExpenses((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
      );
      saveExpenses(updated, spaceId);
      if (isSupabaseConfigured) {
        const updatedExpense = updated.find((e) => e.id === id);
        if (updatedExpense) expensesDb.update(spaceId, updatedExpense).catch(console.error);
      }
      return updated;
    });
  }, [spaceId]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveExpenses(updated, spaceId);
      return updated;
    });
    if (isSupabaseConfigured) {
      expensesDb.delete(id).catch(console.error);
    }
  }, [spaceId]);

  const getExpensesByMonth = useCallback(
    (year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return expenses.filter((e) => e.date.startsWith(prefix));
    },
    [expenses]
  );

  const getMonthlyTotal = useCallback(
    (year: number, month: number) =>
      getExpensesByMonth(year, month).reduce((sum, e) => sum + e.amount, 0),
    [getExpensesByMonth]
  );

  const availableMonths = useCallback(() => {
    const months = new Set(expenses.map((e) => e.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [expenses]);

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByMonth,
    getMonthlyTotal,
    availableMonths,
    cloudSyncError,
    clearCloudSyncError,
  };
}
