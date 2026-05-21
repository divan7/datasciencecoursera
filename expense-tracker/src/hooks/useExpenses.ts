import { useState, useEffect, useCallback } from 'react';
import type { Expense } from '../types/expense';
import { loadExpenses, saveExpenses, generateId } from '../utils/storage';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    setExpenses(loadExpenses());
  }, []);

  const addExpense = useCallback((data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const expense: Expense = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    setExpenses((prev) => {
      const updated = [expense, ...prev];
      saveExpenses(updated);
      return updated;
    });
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, data: Partial<Expense>) => {
    setExpenses((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
      );
      saveExpenses(updated);
      return updated;
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveExpenses(updated);
      return updated;
    });
  }, []);

  const getExpensesByMonth = useCallback(
    (year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return expenses.filter((e) => e.date.startsWith(prefix));
    },
    [expenses]
  );

  const getMonthlyTotal = useCallback(
    (year: number, month: number) => {
      return getExpensesByMonth(year, month).reduce((sum, e) => sum + e.amount, 0);
    },
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
  };
}
