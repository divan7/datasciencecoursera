import Anthropic from '@anthropic-ai/sdk';
import type { Expense } from '../types/expense';

const SYSTEM_PROMPT = `Eres un asistente de finanzas personales especializado en analizar gastos.
Tu tarea es extraer información de gastos a partir de texto libre o imágenes de tickets de compra.

Cuando analices un texto o imagen, devuelve ÚNICAMENTE un JSON válido con los campos del gasto.
No agregues explicaciones ni texto adicional, solo el JSON.

Campos disponibles (todos en español):
- date: fecha en formato YYYY-MM-DD (si no se menciona, usa hoy)
- amount: monto numérico sin símbolo de moneda
- concept: descripción breve del gasto
- category: una de [alimentacion, transporte, hogar, salud, educacion, entretenimiento, ropa, servicios, seguros, suscripciones, viajes, restaurantes, mascotas, belleza, inversiones, deudas, otro]
- paymentMethod: una de [efectivo, tarjeta_debito, tarjeta_credito, transferencia, otro]
- cardLast4: últimos 4 dígitos de la tarjeta si se mencionan
- bank: nombre del banco o emisor de la tarjeta
- store: nombre del establecimiento
- location: ciudad o lugar
- expenseType: "fijo" o "variable"
- frequency: si es fijo, una de [diario, semanal, quincenal, mensual, bimestral, trimestral, semestral, anual]
- installments: número de mensualidades si aplica MSI
- isReimbursable: true o false
- isTaxDeductible: true o false
- invoiceRequested: true o false
- sharedExpense: true o false si es un gasto compartido
- notes: notas adicionales
- tags: array de etiquetas relevantes

Ejemplo de respuesta:
{
  "amount": 350,
  "concept": "Súper semanal",
  "category": "alimentacion",
  "paymentMethod": "tarjeta_debito",
  "store": "Walmart",
  "expenseType": "variable",
  "tags": ["supermercado", "despensa"]
}`;

export async function parseExpenseFromText(
  text: string,
  apiKey: string,
  today: string
): Promise<Partial<Expense>> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Hoy es ${today}. Analiza este texto y extrae la información del gasto:\n\n"${text}"`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Respuesta inesperada del modelo');

  const jsonText = content.text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonText) as Partial<Expense>;
}

export async function parseExpenseFromImage(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  apiKey: string,
  today: string
): Promise<Partial<Expense>> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Hoy es ${today}. Analiza este ticket/recibo y extrae la información del gasto como JSON.`,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Respuesta inesperada del modelo');

  const jsonText = content.text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonText) as Partial<Expense>;
}

export function validatePartialExpense(data: Partial<Expense>): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!data.amount || data.amount <= 0) missing.push('monto');
  if (!data.concept) missing.push('concepto');
  if (!data.category) missing.push('categoría');
  if (!data.paymentMethod) missing.push('forma de pago');

  return { valid: missing.length === 0, missing };
}
