import type { FixedExpenseTemplate, MonthlyCheck } from '../types/fixedExpense';

const TEMPLATES_KEY = 'fixed_expense_templates';
const CHECKS_KEY = 'monthly_checks';

export function loadTemplates(): FixedExpenseTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveTemplates(t: FixedExpenseTemplate[]): void {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t));
}

export function loadChecks(): MonthlyCheck[] {
  try { return JSON.parse(localStorage.getItem(CHECKS_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveChecks(c: MonthlyCheck[]): void {
  localStorage.setItem(CHECKS_KEY, JSON.stringify(c));
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
