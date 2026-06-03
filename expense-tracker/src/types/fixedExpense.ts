import type { Category, User, PaymentMethod, Frequency } from './expense';

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
  // Credit card fields
  isCreditCard?: boolean;         // activa los campos de tarjeta de crédito
  cutDay?: number;                // día de corte (1-31)
  paymentDueDaysAfterCut?: number; // días límite de pago después del corte (default 20)
  minimumPayment?: number;        // pago mínimo requerido
  active: boolean;
  notes?: string;
  createdAt: string;
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


