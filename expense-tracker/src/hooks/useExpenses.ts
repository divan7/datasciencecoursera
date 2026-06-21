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
  const [syncLoading, setSyncLoading] = useState(false);
  const clearErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the spaceId that owns the in-flight fetch so stale responses are discarded
  const fetchingForSpace = useRef<string>('');

  const reportSyncError = useCallback((msg: string) => {
    setCloudSyncError(msg);
    if (clearErrorTimer.current) clearTimeout(clearErrorTimer.current);
    clearErrorTimer.current = setTimeout(() => setCloudSyncError(null), 12000);
  }, []);

  const clearCloudSyncError = useCallback(() => {
    if (clearErrorTimer.current) clearTimeout(clearErrorTimer.current);
    setCloudSyncError(null);
  }, []);

  // Core sync: fetch from Supabase and merge with local cache.
  // Returns true on success, false on failure.
  const syncFromCloud = useCallback(async (sid: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !sid) return false;
    try {
      const remote = await expensesDb.list(sid);

      // Discard response if the user switched spaces while we were waiting
      if (fetchingForSpace.current !== sid) return false;

      const freshLocal = loadExpenses(sid);
      const remoteIds = new Set(remote.map((e) => e.id));
      const localOnly = freshLocal.filter((e) => !remoteIds.has(e.id));

      // Re-upload any local-only expenses to Supabase (non-destructive recovery)
      if (localOnly.length > 0) {
        expensesDb.bulkCreate(sid, localOnly)
          .catch((err) => console.error('No se pudieron re-sincronizar gastos locales:', err));
      }

      const merged = [...remote, ...localOnly]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

      // Only update state if we're still the active space
      if (fetchingForSpace.current === sid) {
        setExpenses(merged);
        saveExpenses(merged, sid);
      }
      return true;
    } catch (err) {
      console.error('[useExpenses] No se pudo leer gastos remotos:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!spaceId) return;

    // Show local cache immediately (fast path)
    const local = loadExpenses(spaceId);
    setExpenses(local);
    setCloudSyncError(null);

    if (!isSupabaseConfigured) return;

    // Mark this space as the one we're fetching for
    fetchingForSpace.current = spaceId;
    setSyncLoading(true);

    syncFromCloud(spaceId).then((ok) => {
      if (fetchingForSpace.current !== spaceId) return; // switched away
      if (!ok) {
        // First attempt failed — retry once after 3 s (handles post-login RLS propagation delay)
        setTimeout(() => {
          if (fetchingForSpace.current !== spaceId) return;
          syncFromCloud(spaceId).then((retryOk) => {
            if (fetchingForSpace.current !== spaceId) return;
            if (!retryOk) {
              reportSyncError(
                'No se pudieron cargar los movimientos de la nube. ' +
                'Verifica tu conexión y toca aquí para reintentar.'
              );
            }
            setSyncLoading(false);
          });
        }, 3000);
      } else {
        setSyncLoading(false);
      }
    });

    return () => {
      // When spaceId changes, mark the old fetch as stale
      fetchingForSpace.current = '';
    };
  }, [spaceId, syncFromCloud]);

  // Manual retry exposed to UI
  const retrySync = useCallback(() => {
    if (!spaceId || !isSupabaseConfigured) return;
    clearCloudSyncError();
    fetchingForSpace.current = spaceId;
    setSyncLoading(true);
    syncFromCloud(spaceId).then((ok) => {
      setSyncLoading(false);
      if (!ok) {
        reportSyncError('El reintento falló. Verifica tu conexión a internet.');
      }
    });
  }, [spaceId, syncFromCloud, clearCloudSyncError, reportSyncError]);

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
    let updatedExpense: Expense | undefined;
    setExpenses((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
      );
      saveExpenses(updated, spaceId);
      updatedExpense = updated.find((e) => e.id === id);
      return updated;
    });
    if (isSupabaseConfigured && updatedExpense) {
      expensesDb.update(spaceId, updatedExpense).catch((err) => {
        console.error('Error al actualizar gasto en la nube:', err);
        reportSyncError('No se pudo actualizar en la nube. El cambio se guardó localmente y se sincronizará cuando la conexión se restablezca.');
      });
    }
  }, [spaceId, reportSyncError]);

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
    syncLoading,
    retrySync,
  };
}
