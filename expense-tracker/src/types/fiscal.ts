import type { Category } from './expense';

// SAT régimen fiscal codes
export type RegimenFiscal =
  | '601' | '603' | '605' | '606' | '607' | '608'
  | '610' | '611' | '612' | '614' | '616'
  | '620' | '621' | '622' | '625' | '626';

export const REGIMENES_FISCALES: Record<RegimenFiscal, string> = {
  '601': 'Régimen General — Personas Morales',
  '603': 'Personas Morales sin Fines de Lucro',
  '605': 'Sueldos, Salarios e Ingresos Asimilados',
  '606': 'Arrendamiento',
  '607': 'Enajenación o Adquisición de Bienes',
  '608': 'Demás Ingresos',
  '610': 'Residentes en el Extranjero sin EP',
  '611': 'Ingresos por Dividendos',
  '612': 'Actividades Empresariales y Profesionales',
  '614': 'Ingresos por Intereses',
  '616': 'Sin Obligaciones Fiscales',
  '620': 'Sociedades Cooperativas de Producción',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '625': 'Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza (RESICO)',
};

// CFDI use codes (SAT 4.0)
export type CfdiUse =
  | 'G01' | 'G02' | 'G03'
  | 'I01' | 'I02' | 'I03' | 'I04' | 'I06' | 'I07' | 'I08'
  | 'D01' | 'D02' | 'D03' | 'D04' | 'D05' | 'D06' | 'D07' | 'D08' | 'D09' | 'D10'
  | 'S01' | 'CP01' | 'CN01';

export const CFDI_USES: Record<CfdiUse, string> = {
  G01: 'Adquisición de mercancias',
  G02: 'Devoluciones, descuentos o bonificaciones',
  G03: 'Gastos en general',
  I01: 'Construcciones',
  I02: 'Mobilario y equipo de oficina',
  I03: 'Equipo de transporte',
  I04: 'Equipo de cómputo y accesorios',
  I06: 'Comunicaciones telefónicas',
  I07: 'Comunicaciones satelitales',
  I08: 'Otra maquinaria y equipo',
  D01: 'Honorarios médicos, dentales y hospitalarios',
  D02: 'Gastos médicos por incapacidad o discapacidad',
  D03: 'Gastos funerales',
  D04: 'Donativos',
  D05: 'Intereses reales — crédito hipotecario',
  D06: 'Aportaciones voluntarias al SAR',
  D07: 'Primas por seguros de gastos médicos',
  D08: 'Transportación escolar obligatoria',
  D09: 'Depósitos en cuentas de ahorro / pensiones',
  D10: 'Pagos por servicios educativos (colegiaturas)',
  S01: 'Sin efectos fiscales',
  CP01: 'Pagos',
  CN01: 'Nómina',
};

export interface FiscalProfile {
  rfc?: string;
  curp?: string;
  razonSocial?: string;           // nombre tal como está en el RFC
  regimenFiscal?: RegimenFiscal;
  actividadEconomica?: string;    // actividad principal (SCIAN)
  cfdiUseDefault?: CfdiUse;       // uso CFDI preferido por defecto
  isPersonaMoral?: boolean;
  taxYear?: number;               // año fiscal para límites
}

// Result of per-ticket fiscal analysis (returned by AI + rule engine)
export interface FiscalAnalysis {
  isFacturatable: boolean;          // ¿se puede pedir factura?
  isDeductible: boolean;            // ¿es deducible bajo el régimen del usuario?
  suggestedCfdiUse?: CfdiUse;
  deductionLimit?: string;          // ej. "hasta $58,000 anuales"
  estimatedDeduction?: number;      // monto estimado deducible
  howToInvoice?: string;            // pasos para pedir la factura
  vendorRfc?: string;               // RFC extraído del ticket
  vendorName?: string;              // nombre del emisor extraído
  isActualInvoice: boolean;         // la imagen ya ES una factura (CFDI)
  cfdiUUID?: string;                // UUID si es una factura
  cfdiValidIssues?: string[];       // problemas de validez detectados
  reasoning: string;                // breve explicación al usuario
}

// Rule-based deductibility info (no AI required)
export interface DeductionRule {
  cfdiUse: CfdiUse;
  limit?: string;
  description: string;
  applicableCategories: Category[];
}

// Which expense categories are potentially deductible per regime
export const DEDUCTION_RULES_BY_REGIME: Partial<Record<RegimenFiscal, DeductionRule[]>> = {
  // Sueldos y Salarios — deducciones personales Art. 151 LISR
  '605': [
    {
      cfdiUse: 'D01',
      description: 'Gastos médicos, dentales y hospitalarios',
      limit: 'Sin tope individual; el total de deducciones personales no puede exceder el 15% del ingreso anual o 5 UMAs anuales',
      applicableCategories: ['salud'],
    },
    {
      cfdiUse: 'D07',
      description: 'Primas de seguro de gastos médicos',
      applicableCategories: ['seguros', 'salud'],
    },
    {
      cfdiUse: 'D08',
      description: 'Transportación escolar (solo si es obligatoria por la escuela)',
      applicableCategories: ['transporte', 'educacion'],
    },
    {
      cfdiUse: 'D10',
      description: 'Colegiaturas',
      limit: 'Preescolar $14,200 · Primaria $12,900 · Secundaria $19,900 · Preparatoria/bachillerato $24,500 · Profesional técnico $17,100 (Decreto presidencial)',
      applicableCategories: ['educacion'],
    },
    {
      cfdiUse: 'D04',
      description: 'Donativos a instituciones autorizadas',
      limit: 'Hasta 7% del ingreso acumulable del año anterior',
      applicableCategories: ['otro'],
    },
    {
      cfdiUse: 'D05',
      description: 'Intereses reales de crédito hipotecario (casa habitación)',
      applicableCategories: ['hogar', 'servicios'],
    },
    {
      cfdiUse: 'D06',
      description: 'Aportaciones voluntarias al SAR/AFORE',
      limit: 'Hasta 10% del ingreso, máximo 5 UMAs anuales',
      applicableCategories: ['inversiones', 'deudas'],
    },
  ],

  // Actividades Empresariales y Profesionales — gastos estrictamente indispensables
  '612': [
    {
      cfdiUse: 'G03',
      description: 'Gastos de operación estrictamente indispensables para la actividad',
      applicableCategories: ['servicios', 'hogar', 'transporte', 'alimentacion', 'restaurantes', 'tecnologia' as Category, 'otro'],
    },
    {
      cfdiUse: 'I04',
      description: 'Equipo de cómputo y accesorios (activo fijo)',
      applicableCategories: ['otro', 'servicios'],
    },
    {
      cfdiUse: 'I03',
      description: 'Equipo de transporte (activo fijo)',
      applicableCategories: ['transporte'],
    },
    {
      cfdiUse: 'D01',
      description: 'Gastos médicos (deducción personal)',
      applicableCategories: ['salud'],
    },
    {
      cfdiUse: 'D10',
      description: 'Colegiaturas (deducción personal)',
      applicableCategories: ['educacion'],
    },
  ],

  // RESICO — Régimen Simplificado de Confianza
  '626': [
    {
      cfdiUse: 'G03',
      description: 'Gastos directamente vinculados con la actividad económica',
      applicableCategories: ['servicios', 'transporte', 'hogar', 'otro'],
    },
    {
      cfdiUse: 'I04',
      description: 'Inversiones en activos fijos necesarios para la actividad',
      applicableCategories: ['otro', 'servicios'],
    },
  ],

  // Arrendamiento
  '606': [
    {
      cfdiUse: 'G03',
      description: 'Gastos de mantenimiento y conservación del inmueble arrendado',
      applicableCategories: ['hogar', 'servicios'],
    },
    {
      cfdiUse: 'G03',
      description: 'Agua, luz y gas (proporcional al área arrendada)',
      applicableCategories: ['servicios', 'hogar'],
    },
    {
      cfdiUse: 'D05',
      description: 'Intereses reales de crédito hipotecario sobre el inmueble',
      applicableCategories: ['hogar', 'deudas'],
    },
  ],

  // Plataformas tecnológicas
  '625': [
    {
      cfdiUse: 'G03',
      description: 'Gastos relacionados con la actividad en plataforma',
      applicableCategories: ['transporte', 'servicios', 'otro'],
    },
    {
      cfdiUse: 'I03',
      description: 'Vehículo utilizado para prestar el servicio',
      applicableCategories: ['transporte'],
    },
  ],
};
