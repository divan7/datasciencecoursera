export type User = 'Ivan' | 'Esposa';

export type PaymentMethod = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'otro';

export type ExpenseType = 'variable' | 'fijo';

export type Frequency = 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export type Category =
  | 'alimentacion'
  | 'transporte'
  | 'hogar'
  | 'salud'
  | 'educacion'
  | 'entretenimiento'
  | 'ropa'
  | 'servicios'
  | 'seguros'
  | 'suscripciones'
  | 'viajes'
  | 'restaurantes'
  | 'mascotas'
  | 'belleza'
  | 'inversiones'
  | 'deudas'
  | 'otro';

export interface Expense {
  id: string;
  date: string;                    // ISO date YYYY-MM-DD
  amount: number;
  currency: string;                // MXN default
  paidBy: User;
  concept: string;
  category: Category;
  subcategory?: string;
  paymentMethod: PaymentMethod;
  cardLast4?: string;              // últimos 4 dígitos tarjeta
  bank?: string;                   // banco o emisor
  store?: string;                  // establecimiento
  location?: string;               // ciudad/lugar
  expenseType: ExpenseType;
  frequency?: Frequency;           // si es gasto fijo
  installments?: number;           // número de MSI
  currentInstallment?: number;     // pago # de MSI
  isReimbursable?: boolean;        // es reembolsable
  isTaxDeductible?: boolean;       // deducible de impuestos
  invoiceRequested?: boolean;      // se solicitó factura
  sharedExpense?: boolean;         // gasto compartido entre ambos
  notes?: string;
  tags?: string[];
  receiptImageBase64?: string;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIES: Record<Category, string> = {
  alimentacion: '🛒 Alimentación',
  transporte: '🚗 Transporte',
  hogar: '🏠 Hogar',
  salud: '💊 Salud',
  educacion: '📚 Educación',
  entretenimiento: '🎬 Entretenimiento',
  ropa: '👗 Ropa',
  servicios: '💡 Servicios',
  seguros: '🛡️ Seguros',
  suscripciones: '📱 Suscripciones',
  viajes: '✈️ Viajes',
  restaurantes: '🍽️ Restaurantes',
  mascotas: '🐾 Mascotas',
  belleza: '💅 Belleza',
  inversiones: '📈 Inversiones',
  deudas: '💳 Deudas',
  otro: '📦 Otro',
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  efectivo: '💵 Efectivo',
  tarjeta_debito: '💳 Débito',
  tarjeta_credito: '💳 Crédito',
  transferencia: '🔄 Transferencia',
  otro: '📦 Otro',
};

export const FREQUENCIES: Record<Frequency, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};
