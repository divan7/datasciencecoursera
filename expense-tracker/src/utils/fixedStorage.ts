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

// Returns true if a template with given frequency is due in month YYYY-MM
export function isDueInMonth(template: FixedExpenseTemplate, yearMonth: string): boolean {
  const [ty, tm] = template.createdAt.slice(0, 7).split('-').map(Number);
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
