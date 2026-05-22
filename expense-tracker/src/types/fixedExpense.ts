import type { Category, User, PaymentMethod, Frequency } from './expense';

export interface FixedExpenseTemplate {
  id: string;
  concept: string;
  expectedAmount: number;
  category: Category;
  paidBy: User;
  paymentMethod: PaymentMethod;
  frequency: Frequency;
  dayOfMonth?: number;       // día esperado de pago (1-31) — mensual, bimestral, trimestral, semestral, anual, quincenal
  dayOfWeek?: number;        // 1=Lunes…7=Domingo — semanal
  paymentMonth?: number;     // 1-12 — anual
  reminderEnabled?: boolean;
  reminderDaysBefore?: number; // días de anticipación (default 1)
  bank?: string;
  cardLast4?: string;
  active: boolean;
  notes?: string;
  createdAt: string;         // YYYY-MM-DD — mes de inicio
}

export type CheckStatus = 'pendiente' | 'confirmado' | 'omitido';

export interface MonthlyCheck {
  id: string;
  month: string;             // YYYY-MM
  templateId: string;
  status: CheckStatus;
  expenseId?: string;        // gasto real vinculado
  actualAmount?: number;
  confirmedAt?: string;
  notes?: string;
}
