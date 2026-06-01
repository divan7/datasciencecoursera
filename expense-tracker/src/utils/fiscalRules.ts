import type { Expense } from '../types/expense';
import type { FiscalProfile, CfdiUse, DeductionRule } from '../types/fiscal';
import { DEDUCTION_RULES_BY_REGIME, CFDI_USES } from '../types/fiscal';

export interface QuickDeductionResult {
  isDeductible: boolean;
  rule?: DeductionRule;
  reasoning: string;
  suggestedCfdiUse?: CfdiUse;
}

/** Rule-based deductibility check — no AI required. */
export function checkDeductibility(expense: Expense, profile: FiscalProfile): QuickDeductionResult {
  if (!profile.regimenFiscal) {
    return { isDeductible: false, reasoning: 'Sin régimen fiscal configurado en tu perfil.' };
  }
  if (expense.transactionType === 'ingreso') {
    return { isDeductible: false, reasoning: 'Los ingresos no se deducen.' };
  }

  const rules = DEDUCTION_RULES_BY_REGIME[profile.regimenFiscal] ?? [];
  const match = rules.find((r) => r.applicableCategories.includes(expense.category));

  if (!match) {
    return {
      isDeductible: false,
      reasoning: `En el régimen "${profile.regimenFiscal}" los gastos de la categoría "${expense.category}" generalmente no son deducibles.`,
    };
  }

  return {
    isDeductible: true,
    rule: match,
    suggestedCfdiUse: match.cfdiUse,
    reasoning: `${match.description}. Uso CFDI: ${match.cfdiUse} — ${CFDI_USES[match.cfdiUse]}${match.limit ? `. Límite: ${match.limit}` : ''}.`,
  };
}

/** Estimate deductible amount. Returns undefined if not calculable without income info. */
export function estimateDeductibleAmount(expense: Expense, profile: FiscalProfile): number | undefined {
  const res = checkDeductibility(expense, profile);
  if (!res.isDeductible) return 0;
  // Without income data we can't apply % caps — return full amount as max potential
  return expense.amount;
}

/** Summary across multiple expenses */
export function summarizeDeductions(expenses: Expense[], profile: FiscalProfile) {
  const gastos = expenses.filter((e) => e.transactionType !== 'ingreso');
  const results = gastos.map((e) => ({ expense: e, ...checkDeductibility(e, profile) }));

  const deductibles = results.filter((r) => r.isDeductible);
  const byUse: Record<string, { label: string; total: number; count: number }> = {};

  for (const r of deductibles) {
    const use = r.suggestedCfdiUse ?? 'G03';
    if (!byUse[use]) byUse[use] = { label: CFDI_USES[use as CfdiUse] ?? use, total: 0, count: 0 };
    byUse[use].total += r.expense.amount;
    byUse[use].count += 1;
  }

  return {
    totalPotential: deductibles.reduce((s, r) => s + r.expense.amount, 0),
    deductibleCount: deductibles.length,
    totalGastos: gastos.length,
    byUse,
    details: results,
  };
}
