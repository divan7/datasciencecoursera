import type { Category, User, PaymentMethod, Frequency } from './expense';

export type FixedExpenseType = 'credito' | 'servicio';
export type CreditType = 'tarjeta_credito' | 'credito_automotriz' | 'credito_hipotecario' | 'otro_credito';

export interface FixedExpenseTemplate {
  id: string;
  concept: string;
  expectedAmount: number;
  category: Category;
  paidBy: User;
  paymentMethod: PaymentMethod;
  frequency: Frequency;
  dayOfMonth?: number;            // día esperado de pago (1-31)
  dayOfWeek?: number;             // 1=Lunes…7=Domingo — semanal
  paymentMonth?: number;          // 1-12 — anual
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;    // días de anticipación (default 1)
  bank?: string;
  cardLast4?: string;
  // Classification
  fixedExpenseType?: FixedExpenseType;  // 'credito' | 'servicio'
  creditType?: CreditType;              // sub-tipo cuando es crédito
  // Credit card fields
  isCreditCard?: boolean;         // backward-compat — derivado de creditType en UI nueva
  cutDay?: number;                // día de corte (1-31)
  paymentDueDaysAfterCut?: number; // días límite de pago después del corte (default 20)
  minimumPayment?: number;        // pago mínimo requerido
  active: boolean;
  variableAmount?: boolean;       // true = monto varía cada periodo (CFE, tarjeta, etc.)
  notes?: string;
  createdAt: string;
  endsAt?: string;                // YYYY-MM-DD — fecha de fin, opcional
  defaultSplit?: DefaultSplit;    // división guardada, se pre-rellena al confirmar
}

export interface DefaultSplit {
  mode: 'equal' | 'percent' | 'amount';
  entries: { name: string; value: number }[]; // value = 0 para 'equal', % o $ para los otros
}

export type CheckStatus = 'pendiente' | 'confirmado' | 'omitido';

export interface MonthlyCheck {
  id: string;
  month: string;
  templateId: string;
  status: CheckStatus;
  expenseId?: string;
  actualAmount?: number;
  confirmedAt?: string;
  notes?: string;
}
