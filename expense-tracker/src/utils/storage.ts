import type { Expense } from '../types/expense';

const dataKey = (spaceId: string) => `expense_tracker_data_${spaceId}`;
const settingsKey = (spaceId: string) => `expense_tracker_settings_${spaceId}`;
const GLOBAL_API_KEY = 'expense_tracker_api_key';

export interface AppSettings {
  currency: string;
  anthropicApiKey?: string;
  // keep these for migration compatibility:
  userName1?: string;
  userName2?: string;
  currentUser?: string;
}

export function saveExpenses(expenses: Expense[], spaceId: string): void {
  localStorage.setItem(dataKey(spaceId), JSON.stringify(expenses));
}

export function loadExpenses(spaceId: string): Expense[] {
  const raw = localStorage.getItem(dataKey(spaceId));
  if (!raw) return [];
  try { return JSON.parse(raw) as Expense[]; }
  catch { return []; }
}

export function saveSettings(settings: AppSettings, spaceId: string): void {
  // Persist API key globally so it survives space switches and new spaces
  if (settings.anthropicApiKey) {
    localStorage.setItem(GLOBAL_API_KEY, settings.anthropicApiKey);
  } else {
    localStorage.removeItem(GLOBAL_API_KEY);
  }
  localStorage.setItem(settingsKey(spaceId), JSON.stringify(settings));
}

export function loadSettings(spaceId: string): AppSettings {
  const raw = localStorage.getItem(settingsKey(spaceId));
  const base: AppSettings = { currency: 'MXN' };
  let saved: AppSettings = base;
  if (raw) {
    try { saved = JSON.parse(raw) as AppSettings; } catch { /* ignore */ }
  }
  // Fall back to global API key if this space doesn't have one yet
  if (!saved.anthropicApiKey) {
    const globalKey = localStorage.getItem(GLOBAL_API_KEY);
    if (globalKey) saved = { ...saved, anthropicApiKey: globalKey };
  }
  return saved;
}

// Legacy (no spaceId) load for migration
export function loadLegacySettings(): AppSettings | null {
  const raw = localStorage.getItem('expense_tracker_settings');
  if (!raw) return null;
  try { return JSON.parse(raw) as AppSettings; }
  catch { return null; }
}

export function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Save a single expense directly to any space (bypasses React state — use for cross-space saves). */
export function saveExpenseToAnySpace(
  data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
  spaceId: string,
): Expense {
  const now = new Date().toISOString();
  const expense: Expense = { ...data, id: generateId(), createdAt: now, updatedAt: now };
  const existing = loadExpenses(spaceId);
  saveExpenses([expense, ...existing], spaceId);
  return expense;
}
