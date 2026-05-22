import Anthropic from '@anthropic-ai/sdk';
import type { Expense } from '../types/expense';

const FIELDS = `Campos disponibles (todos en español):
- date: fecha en formato YYYY-MM-DD (si no se menciona, usa hoy)
- amount: monto numérico sin símbolo de moneda
- concept: descripción breve del gasto
- category: una de [alimentacion, transporte, hogar, salud, educacion, entretenimiento, ropa, servicios, seguros, suscripciones, viajes, restaurantes, mascotas, belleza, inversiones, deudas, otro]
- paymentMethod: una de [efectivo, tarjeta_debito, tarjeta_credito, transferencia, otro]
- cardLast4: últimos 4 dígitos de la tarjeta si se mencionan
- bank: nombre del banco o emisor
- store: nombre del establecimiento
- location: ciudad o lugar
- expenseType: "fijo" o "variable"
- frequency: si es fijo, una de [diario, semanal, quincenal, mensual, bimestral, trimestral, semestral, anual]
- installments: número de mensualidades MSI
- isReimbursable: true o false
- isTaxDeductible: true o false
- invoiceRequested: true o false
- sharedExpense: true o false
- notes: notas adicionales
- tags: array de etiquetas`;

const SINGLE_SYSTEM = `Eres un asistente de finanzas personales.
Extrae información de UN gasto desde texto libre o imágenes.
Devuelve ÚNICAMENTE un JSON válido con los campos del gasto. Sin explicaciones.

${FIELDS}

Ejemplo:
{"amount":350,"concept":"Súper semanal","category":"alimentacion","paymentMethod":"tarjeta_debito","store":"Walmart","expenseType":"variable"}`;

const MULTI_TEXT_SYSTEM = `Eres un asistente de finanzas personales.
El usuario puede describir UNO o VARIOS gastos en su mensaje.

Devuelve ÚNICAMENTE un JSON array válido — siempre array, aunque sea un solo gasto. Sin explicaciones.

${FIELDS}

Ejemplo un gasto: [{"amount":350,"concept":"Walmart","category":"alimentacion","paymentMethod":"tarjeta_debito"}]
Ejemplo varios: [{"amount":219,"concept":"Netflix","category":"suscripciones"},{"amount":89,"concept":"Spotify","category":"suscripciones"}]`;

const RECEIPT_SYSTEM = `Eres un asistente de finanzas personales especializado en leer tickets de compra.
Analiza el ticket y desglosa los gastos en grupos significativos.

Reglas:
- Si el ticket tiene pocos artículos (≤6), crea uno por artículo relevante
- Si tiene muchos artículos, agrúpalos por categoría (ej: "Alimentos", "Bebidas", "Higiene", "Snacks")
- Usa el total del ticket como referencia; los montos de los grupos deben sumar el total
- Siempre devuelve un JSON array, aunque sea un solo elemento
- Incluye la fecha del ticket si aparece; si no, usa hoy
- Usa el establecimiento como "store" en todos los registros

${FIELDS}

Ejemplo para ticket de supermercado con muchos artículos:
[
  {"amount":320,"concept":"Alimentos y despensa","category":"alimentacion","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15"},
  {"amount":85,"concept":"Bebidas","category":"alimentacion","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15"},
  {"amount":95,"concept":"Productos de higiene","category":"hogar","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15"}
]`;

function stripJson(raw: string): string {
  return raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
}

export async function parseExpenseFromText(
  text: string,
  apiKey: string,
  today: string,
): Promise<Partial<Expense>> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SINGLE_SYSTEM,
    messages: [{ role: 'user', content: `Hoy es ${today}. Texto: "${text}"` }],
  });
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Respuesta inesperada del modelo');
  return JSON.parse(stripJson(content.text)) as Partial<Expense>;
}

export async function parseMultipleExpensesFromText(
  text: string,
  apiKey: string,
  today: string,
): Promise<Partial<Expense>[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: MULTI_TEXT_SYSTEM,
    messages: [{ role: 'user', content: `Hoy es ${today}. Analiza este texto y extrae todos los gastos:\n\n"${text}"` }],
  });
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Respuesta inesperada del modelo');
  const parsed = JSON.parse(stripJson(content.text));
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function parseExpenseFromImage(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  apiKey: string,
  today: string,
): Promise<Partial<Expense>> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SINGLE_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
        { type: 'text', text: `Hoy es ${today}. Analiza este ticket y extrae la información del gasto como JSON.` },
      ],
    }],
  });
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Respuesta inesperada del modelo');
  return JSON.parse(stripJson(content.text)) as Partial<Expense>;
}

export async function parseReceiptItems(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  apiKey: string,
  today: string,
): Promise<Partial<Expense>[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: RECEIPT_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
        { type: 'text', text: `Hoy es ${today}. Desglosa todos los gastos de este ticket como JSON array.` },
      ],
    }],
  });
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Respuesta inesperada del modelo');
  const parsed = JSON.parse(stripJson(content.text));
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function validatePartialExpense(data: Partial<Expense>): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!data.amount || data.amount <= 0) missing.push('monto');
  if (!data.concept) missing.push('concepto');
  if (!data.category) missing.push('categoría');
  if (!data.paymentMethod) missing.push('forma de pago');
  return { valid: missing.length === 0, missing };
}
