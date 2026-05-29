import Anthropic from '@anthropic-ai/sdk';
import type { Expense } from '../types/expense';

const FIELDS = `Campos disponibles (todos en español):
- transactionType: "gasto" o "ingreso" — OBLIGATORIO. Salarios, ventas, reembolsos, etc. son "ingreso".
- date: fecha en formato YYYY-MM-DD (si no se menciona, usa hoy)
- amount: monto numérico sin símbolo de moneda
- concept: descripción breve
- category:
    Si transactionType es "gasto": una de [alimentacion, transporte, hogar, salud, educacion, entretenimiento, ropa, servicios, seguros, suscripciones, viajes, restaurantes, mascotas, belleza, inversiones, deudas, otro]
    Si transactionType es "ingreso": una de [salario, freelance, negocio, inversiones_ingreso, renta, bono, reembolso, otro_ingreso]
- paymentMethod: una de [efectivo, tarjeta_debito, tarjeta_credito, transferencia, otro]
- cardLast4: últimos 4 dígitos de la tarjeta si se mencionan
- bank: nombre del banco o emisor
- store: nombre del establecimiento (solo para gastos)
- location: ciudad o lugar
- expenseType: "fijo" o "variable"
- frequency: si es fijo, una de [diario, semanal, quincenal, mensual, bimestral, trimestral, semestral, anual]
- installments: número de mensualidades MSI (solo gastos)
- isReimbursable: true o false
- isTaxDeductible: true o false
- invoiceRequested: true o false
- sharedExpense: true o false
- notes: notas adicionales
- tags: array de etiquetas`;

const SINGLE_SYSTEM = `Eres un asistente de finanzas personales.
Extrae información de UNA transacción (gasto o ingreso) desde texto libre o imágenes.
Devuelve ÚNICAMENTE un JSON válido con los campos. Sin texto adicional, sin comentarios, sin markdown.

${FIELDS}

Ejemplo gasto: {"transactionType":"gasto","amount":350,"concept":"Súper semanal","category":"alimentacion","paymentMethod":"tarjeta_debito","store":"Walmart","expenseType":"variable"}
Ejemplo ingreso: {"transactionType":"ingreso","amount":15000,"concept":"Salario quincenal","category":"salario","paymentMethod":"transferencia","expenseType":"fijo","frequency":"quincenal"}`;

const MULTI_TEXT_SYSTEM = `Eres un asistente de finanzas personales.
El usuario describe UNA o VARIAS transacciones (gastos o ingresos) en su mensaje.

Devuelve ÚNICAMENTE un JSON array válido — siempre array, aunque sea un solo elemento.
Sin texto adicional, sin comentarios, sin markdown. Solo el JSON array.

${FIELDS}

Ejemplo gastos: [{"transactionType":"gasto","amount":350,"concept":"Walmart","category":"alimentacion","paymentMethod":"tarjeta_debito"},{"transactionType":"gasto","amount":89,"concept":"Spotify","category":"suscripciones"}]
Ejemplo mixto: [{"transactionType":"ingreso","amount":15000,"concept":"Salario","category":"salario","paymentMethod":"transferencia"},{"transactionType":"gasto","amount":500,"concept":"Gasolina","category":"transporte","paymentMethod":"efectivo"}]`;

const RECEIPT_SYSTEM = `Eres un asistente de finanzas personales especializado en leer tickets de compra.

PASO 1 — Identifica el establecimiento:
Busca el nombre del negocio/tienda en el encabezado, logo o pie del ticket (ej: Walmart, OXXO, Costco, Farmacias Guadalajara, etc.).
Ese valor es OBLIGATORIO. Inclúyelo como "store" en TODOS los registros del array.
Si no logras leerlo claramente, usa el tipo de negocio que puedas inferir (ej: "Supermercado", "Farmacia", "Restaurante").

PASO 2 — Desglosa los artículos:
- Si el ticket tiene ≤6 artículos, crea uno por artículo relevante
- Si tiene muchos artículos, agrúpalos por categoría (ej: "Alimentos", "Bebidas", "Higiene", "Snacks")
- Los montos de los grupos deben sumar el total del ticket
- Incluye la fecha del ticket si aparece; si no, usa hoy

PASO 3 — Devuelve ÚNICAMENTE un JSON array válido. Sin texto adicional, sin comentarios, sin markdown.

${FIELDS}

Ejemplo para ticket de supermercado:
[
  {"amount":320,"concept":"Alimentos y despensa","category":"alimentacion","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15","transactionType":"gasto","expenseType":"variable"},
  {"amount":85,"concept":"Bebidas","category":"alimentacion","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15","transactionType":"gasto","expenseType":"variable"},
  {"amount":95,"concept":"Productos de higiene","category":"hogar","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15","transactionType":"gasto","expenseType":"variable"}
]`;

function stripJson(raw: string): string {
  let s = raw.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
  // Extract only the first complete JSON array or object, discarding trailing text/comments
  const startArr = s.indexOf('[');
  const startObj = s.indexOf('{');
  const start = startArr === -1 ? startObj : startObj === -1 ? startArr : Math.min(startArr, startObj);
  if (start > 0) s = s.slice(start);
  const lastArr = s.lastIndexOf(']');
  const lastObj = s.lastIndexOf('}');
  const end = Math.max(lastArr, lastObj);
  if (end !== -1 && end < s.length - 1) s = s.slice(0, end + 1);
  return s;
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
