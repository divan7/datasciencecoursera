import Anthropic from '@anthropic-ai/sdk';
import type { Expense } from '../types/expense';
import type { FiscalProfile, FiscalAnalysis } from '../types/fiscal';
import { REGIMENES_FISCALES, CFDI_USES, getActiveRegimenes } from '../types/fiscal';

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
- payments: array de pagadores [{name, amount}] — solo si el gasto fue pagado por más de una persona; ej. [{"name":"Ivan","amount":300},{"name":"María","amount":200}]
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

REGLA PRINCIPAL — transactionType:
Por defecto clasifica como "gasto". Solo usa "ingreso" si el texto indica explícitamente que se trata de dinero recibido (salario, venta, cobro, reembolso recibido, honorarios cobrados, etc.).

REGLAS — expenseType y frequency:
1. Si el texto menciona "fijo", "fija", "gasto fijo", "pago fijo", o una frecuencia de pago → expenseType:"fijo". Si no → expenseType:"variable".
2. Detecta la frecuencia EXACTA según el texto (no asumas mensual si hay otra indicación):
   - "diario","cada día","todos los días" → "diario"
   - "semanal","cada semana","todas las semanas" → "semanal"
   - "quincenal","cada 15 días","dos veces al mes","cada quincena" → "quincenal"
   - "mensual","cada mes","todos los meses","al mes" → "mensual"
   - "bimestral","cada 2 meses","cada dos meses","bimestralmente" → "bimestral"
   - "trimestral","cada 3 meses","cada trimestre","cada tres meses" → "trimestral"
   - "semestral","cada 6 meses","cada semestre","dos veces al año" → "semestral"
   - "anual","cada año","anualmente","una vez al año" → "anual"
3. Si el texto dice "fijo" sin frecuencia, infiere del contexto: servicios públicos (luz, agua, gas, internet, teléfono) → "mensual"; suscripciones a servicios → "mensual"; seguros → "mensual" o "anual" según contexto.
4. Extrae el día de pago si se menciona (ej "el día 5 de cada mes", "los viernes") → dayOfMonth o dayOfWeek.
5. Extrae banco y últimos 4 dígitos si se mencionan → bank, cardLast4.

${FIELDS}

Ejemplo gastos: [{"transactionType":"gasto","amount":350,"concept":"Walmart","category":"alimentacion","paymentMethod":"tarjeta_debito","expenseType":"variable"},{"transactionType":"gasto","amount":89,"concept":"Spotify","category":"suscripciones","expenseType":"fijo","frequency":"mensual"}]
Ejemplo con fijo: [{"transactionType":"gasto","amount":1200,"concept":"Renta mensual","category":"hogar","paymentMethod":"transferencia","expenseType":"fijo","frequency":"mensual"}]
Ejemplo mixto: [{"transactionType":"ingreso","amount":15000,"concept":"Salario","category":"salario","paymentMethod":"transferencia"},{"transactionType":"gasto","amount":500,"concept":"Gasolina","category":"transporte","paymentMethod":"efectivo","expenseType":"variable"}]
Ejemplo multi-pagador: [{"transactionType":"gasto","amount":500,"concept":"Cena restaurante","category":"restaurantes","paymentMethod":"tarjeta_debito","expenseType":"variable","sharedExpense":true,"payments":[{"name":"Ivan","amount":300},{"name":"María","amount":200}]}]`;

const RECEIPT_SYSTEM = `Eres un asistente de finanzas personales especializado en leer tickets de compra.

PASO 1 — Identifica el establecimiento:
Busca el nombre del negocio/tienda en el encabezado, logo o pie del ticket (ej: Walmart, OXXO, Costco, Farmacias Guadalajara, etc.).
Ese valor es OBLIGATORIO. Inclúyelo como "store" en TODOS los registros.
Si no logras leerlo claramente, usa el tipo de negocio que puedas inferir (ej: "Supermercado", "Farmacia", "Restaurante").

PASO 2 — Localiza el TOTAL del ticket:
Busca el monto total cobrado (puede llamarse "TOTAL", "TOTAL A PAGAR", "IMPORTE TOTAL", "GRAND TOTAL", etc.).
Si no puedes leerlo con claridad, usa null.

PASO 3 — Desglosa los artículos:
- Si el ticket tiene ≤6 artículos, crea uno por artículo relevante
- Si tiene muchos artículos, agrúpalos por categoría (ej: "Alimentos", "Bebidas", "Higiene", "Snacks")
- Los montos de los grupos DEBEN sumar exactamente el total del ticket
- Incluye la fecha del ticket si aparece; si no, usa hoy

PASO 3b — Detecta si es gasto fijo:
- Si el documento es una factura de servicio recurrente (internet, luz, gas, agua, teléfono, suscripción, renta, seguro, membresía, etc.) → expenseType:"fijo"
- Para servicios sin frecuencia explícita: servicios públicos (luz/agua/gas/internet/teléfono) → frequency:"mensual"; seguros → "mensual"; suscripciones digitales → "mensual"
- Si es un ticket de tienda/supermercado/restaurante → expenseType:"variable"

PASO 4 — Devuelve ÚNICAMENTE este objeto JSON. Sin texto adicional, sin comentarios, sin markdown:
{
  "detectedTotal": <número o null>,
  "items": [...]
}

${FIELDS}

Ejemplo:
{
  "detectedTotal": 500.00,
  "items": [
    {"amount":320,"concept":"Alimentos y despensa","category":"alimentacion","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15","transactionType":"gasto","expenseType":"variable"},
    {"amount":85,"concept":"Bebidas","category":"alimentacion","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15","transactionType":"gasto","expenseType":"variable"},
    {"amount":95,"concept":"Productos de higiene","category":"hogar","store":"Walmart","paymentMethod":"tarjeta_debito","date":"2024-01-15","transactionType":"gasto","expenseType":"variable"}
  ]
}`;

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
  transactionType?: 'gasto' | 'ingreso',
): Promise<{ items: Partial<Expense>[]; detectedTotal: number | null }> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const typeHint = transactionType === 'ingreso'
    ? `\nIMPORTANTE: Este documento es un INGRESO (factura cobrada, recibo de pago recibido, estado de honorarios, nómina, etc.). Clasifica TODOS los conceptos con transactionType:"ingreso" y usa categorías de ingreso (salario, freelance, negocio, renta, bono, reembolso, etc.).`
    : '';
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: RECEIPT_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
        { type: 'text', text: `Hoy es ${today}. Desglosa todos los conceptos de este documento como JSON.${typeHint}` },
      ],
    }],
  });
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Respuesta inesperada del modelo');
  const parsed = JSON.parse(stripJson(content.text));
  // Handle both old array format and new { detectedTotal, items } format
  const raw = Array.isArray(parsed)
    ? { items: parsed, detectedTotal: null }
    : { items: Array.isArray(parsed.items) ? parsed.items : [], detectedTotal: typeof parsed.detectedTotal === 'number' ? parsed.detectedTotal : null };
  // Belt-and-suspenders: force transactionType on every item when caller specified it
  if (transactionType) {
    raw.items = raw.items.map((it: Partial<Expense>) => ({ ...it, transactionType }));
  }
  return raw;
}

/**
 * Analyzes a ticket/receipt image for fiscal deductibility.
 * If the image is an actual CFDI (factura), validates its key fields.
 */
export async function analyzeTicketFiscal(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  apiKey: string,
  profile: FiscalProfile,
  expenses: Array<Pick<Expense, 'concept' | 'amount' | 'category'>>,
): Promise<FiscalAnalysis> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const activeRegimenes = getActiveRegimenes(profile);
  const regimeLabel = activeRegimenes.length > 0
    ? activeRegimenes.map((r) => `${r} — ${REGIMENES_FISCALES[r]}`).join('; ')
    : 'No especificado';

  const cfdiUsesJson = JSON.stringify(CFDI_USES);
  const expensesJson = JSON.stringify(expenses);

  const systemPrompt = `Eres un experto en fiscalidad mexicana (SAT, LISR, LIVA, CFDI 4.0).
Analizas tickets y facturas para determinar si son deducibles y cómo facturarlos.
El usuario puede tener más de un régimen fiscal; evalúa en cuál le conviene más deducir el gasto.

Responde SIEMPRE con JSON puro, sin markdown, con exactamente estos campos:
{
  "isFacturatable": boolean,         // ¿se puede pedir CFDI por esta compra?
  "isDeductible": boolean,           // ¿es deducible bajo alguno de los regímenes del usuario?
  "suggestedCfdiUse": string|null,   // código de uso CFDI (ej. "D01", "G03")
  "deductionLimit": string|null,     // límite de deducción si aplica
  "estimatedDeduction": number|null, // monto estimado deducible (número)
  "howToInvoice": string|null,       // pasos concretos para pedir la factura
  "vendorRfc": string|null,          // RFC del emisor si visible en la imagen
  "vendorName": string|null,         // nombre del negocio
  "isActualInvoice": boolean,        // ¿la imagen ES una factura CFDI? (no un ticket)
  "cfdiUUID": string|null,           // UUID/folio fiscal si es factura
  "cfdiValidIssues": string[]|null,  // problemas detectados si es factura
  "reasoning": string                // explicación breve en español para el usuario, indicando en qué régimen conviene deducir si aplica
}

Legislación relevante:
- Art. 27 LISR: deducción de gastos estrictamente indispensables para actividad empresarial
- Art. 151 LISR: deducciones personales (D01-D10) para asalariados
- CFDI 4.0: requiere RFC receptor, uso CFDI, régimen fiscal
- Para ser deducible el CFDI debe incluir: RFC emisor válido, RFC receptor, uso CFDI correcto

Usos CFDI disponibles: ${cfdiUsesJson}`;

  const userMsg = `Régimen(es) fiscal(es) del usuario: ${regimeLabel}
RFC del usuario: ${profile.rfc ?? 'No proporcionado'}
Razón social: ${profile.razonSocial ?? 'No proporcionada'}

Gastos registrados de este ticket:
${expensesJson}

Analiza la imagen y responde JSON.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
        { type: 'text', text: userMsg },
      ],
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Respuesta inesperada');
  const parsed = JSON.parse(stripJson(content.text)) as FiscalAnalysis;
  return {
    isFacturatable: parsed.isFacturatable ?? false,
    isDeductible: parsed.isDeductible ?? false,
    suggestedCfdiUse: parsed.suggestedCfdiUse,
    deductionLimit: parsed.deductionLimit,
    estimatedDeduction: parsed.estimatedDeduction ?? undefined,
    howToInvoice: parsed.howToInvoice ?? undefined,
    vendorRfc: parsed.vendorRfc ?? undefined,
    vendorName: parsed.vendorName ?? undefined,
    isActualInvoice: parsed.isActualInvoice ?? false,
    cfdiUUID: parsed.cfdiUUID ?? undefined,
    cfdiValidIssues: parsed.cfdiValidIssues ?? undefined,
    reasoning: parsed.reasoning ?? '',
  };
}

export async function parseFixedExpensesFromCSV(
  csvText: string,
  apiKey: string,
  memberNames: string[],
): Promise<Partial<Record<string, unknown>>[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const membersStr = memberNames.length > 0 ? memberNames.join(', ') : 'el primer miembro disponible';
  const systemPrompt = `Eres un asistente de finanzas personales. Recibes texto en formato CSV (puede ser el template estándar u otro formato personalizado) con gastos fijos recurrentes.

Interpreta las columnas y devuelve ÚNICAMENTE un JSON array válido. Sin texto adicional, sin markdown.

Miembros disponibles para "paidBy" (usa el nombre exacto): ${membersStr}

Campos del objeto de salida (todos requeridos salvo los marcados opcionales):
- concept: string
- expectedAmount: number
- category: una de [alimentacion, transporte, hogar, salud, educacion, entretenimiento, ropa, servicios, seguros, suscripciones, viajes, restaurantes, mascotas, belleza, inversiones, deudas, otro]
- paidBy: string (nombre exacto del miembro; si no se especifica usa "${memberNames[0] ?? ''}")
- paymentMethod: efectivo | tarjeta_debito | tarjeta_credito | transferencia | otro
- frequency: diario | semanal | quincenal | mensual | bimestral | trimestral | semestral | anual
- dayOfMonth: number|null (1-31, día de pago)
- bank: string|null
- cardLast4: string|null (4 dígitos)
- fixedExpenseType: "credito" | "servicio"
- isCreditCard: boolean
- cutDay: number|null (día de corte; solo si isCreditCard=true)
- paymentDueDaysAfterCut: number|null (default 20; solo si isCreditCard=true)
- reminderEnabled: boolean (default false)
- reminderDaysBefore: number (default 3)
- active: boolean (default true)

Ejemplo de salida:
[{"concept":"Netflix","expectedAmount":219,"category":"suscripciones","paidBy":"${memberNames[0] ?? 'Ivan'}","paymentMethod":"tarjeta_credito","frequency":"mensual","dayOfMonth":1,"bank":"Banamex","cardLast4":"5678","fixedExpenseType":"servicio","isCreditCard":false,"cutDay":null,"paymentDueDaysAfterCut":null,"reminderEnabled":false,"reminderDaysBefore":3,"active":true}]`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Interpreta este CSV y devuelve el JSON array:\n\n${csvText}` }],
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
