import type { Expense } from '../types/expense';

const STORAGE_KEY = 'expense_tracker_data';
const SETTINGS_KEY = 'expense_tracker_settings';

export interface AppSettings {
  currentUser: 'Ivan' | 'Esposa';
  userName1: string;
  userName2: string;
  currency: string;
  anthropicApiKey?: string;
}

export function saveExpenses(expenses: Expense[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function loadExpenses(): Expense[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Expense[];
  } catch {
    return [];
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return {
      currentUser: 'Ivan',
      userName1: 'Ivan',
      userName2: 'Esposa',
      currency: 'MXN',
    };
  }
  try {
    return JSON.parse(raw) as AppSettings;
  } catch {
    return {
      currentUser: 'Ivan',
      userName1: 'Ivan',
      userName2: 'Esposa',
      currency: 'MXN',
    };
  }
}

export function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
