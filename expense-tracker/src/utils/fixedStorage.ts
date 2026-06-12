import type { FixedExpenseTemplate, MonthlyCheck } from '../types/fixedExpense';

const tplKey = (spaceId: string) => `fixed_expense_templates_${spaceId}`;
const chkKey = (spaceId: string) => `monthly_checks_${spaceId}`;

export function loadTemplates(spaceId: string): FixedExpenseTemplate[] {
  try { return JSON.parse(localStorage.getItem(tplKey(spaceId)) ?? '[]'); }
  catch { return []; }
}

export function saveTemplates(t: FixedExpenseTemplate[], spaceId: string): void {
  localStorage.setItem(tplKey(spaceId), JSON.stringify(t));
}

export function loadChecks(spaceId: string): MonthlyCheck[] {
  try { return JSON.parse(localStorage.getItem(chkKey(spaceId)) ?? '[]'); }
  catch { return []; }
}

export function saveChecks(c: MonthlyCheck[], spaceId: string): void {
  localStorage.setItem(chkKey(spaceId), JSON.stringify(c));
}

export function generateFixedId(): string {
  return `fix_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Returns the next calendar date when a template payment is due, starting from fromDate.
export function getNextDueDate(template: FixedExpenseTemplate, fromDate: Date = new Date()): Date | null {
  const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

  if (template.frequency === 'diario') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  }

  if (template.frequency === 'semanal') {
    // dayOfWeek: 1=Mon … 7=Sun → JS getDay(): 0=Sun, 1=Mon … 6=Sat
    const targetDow = (template.dayOfWeek ?? 1) % 7;
    const currentDow = today.getDay();
    let daysAhead = targetDow - currentDow;
    if (daysAhead <= 0) daysAhead += 7;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysAhead);
  }

  // Month-based frequencies: mensual, quincenal, bimestral, trimestral, semestral, anual
  const dom = template.dayOfMonth ?? 1;
  for (let i = 0; i <= 24; i++) {
    const y = today.getFullYear() + Math.floor((today.getMonth() + i) / 12);
    const m = (today.getMonth() + i) % 12;
    const yearMonth = `${y}-${String(m + 1).padStart(2, '0')}`;
    if (!isDueInMonth(template, yearMonth)) continue;
    const candidate = new Date(y, m, dom);
    if (candidate >= today) return candidate;
  }
  return null;
}

// Returns true if a template with given frequency is due in month YYYY-MM
export function isDueInMonth(template: FixedExpenseTemplate, yearMonth: string): boolean {
  // Respect end date — expired templates never appear after their last month
  if (template.endsAt && yearMonth > template.endsAt.slice(0, 7)) return false;

  const createdSlice = (template.createdAt ?? '2020-01').slice(0, 7);
  const [ty, tm] = createdSlice.split('-').map(Number);
  const [vy, vm] = yearMonth.split('-').map(Number);

  // Template hasn't started yet
  if (vy < ty || (vy === ty && vm < tm)) return false;

  const diffMonths = (vy - ty) * 12 + (vm - tm);

  switch (template.frequency) {
    case 'diario':
    case 'semanal':
    case 'quincenal':
    case 'mensual':   return true;
    case 'bimestral': return diffMonths % 2 === 0;
    case 'trimestral':return diffMonths % 3 === 0;
    case 'semestral': return diffMonths % 6 === 0;
    case 'anual':     return diffMonths % 12 === 0;
    default:          return true;
  }
}
