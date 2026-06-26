import { useState, useRef } from 'react';
import { Upload, Download, Check, X, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { FixedExpenseTemplate, FixedExpenseType } from '../types/fixedExpense';
import type { Category, PaymentMethod, Frequency } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS } from '../types/expense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';
import { parseFixedExpensesFromCSV } from '../services/claudeService';

const FREQ_LABELS: Record<Frequency, string> = {
  diario: 'Diario', semanal: 'Semanal', quincenal: 'Quincenal',
  mensual: 'Mensual', bimestral: 'Bimestral', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual',
};

const CSV_HEADERS = [
  'concepto', 'monto_esperado', 'categoria', 'quien_paga', 'forma_de_pago',
  'frecuencia', 'dia_de_pago', 'banco', 'ultimos4_tarjeta',
  'tipo', 'es_tarjeta_credito', 'dia_de_corte', 'dias_limite_pago',
  'recordatorio', 'dias_anticipacion',
];

const CSV_EXAMPLE_ROWS = [
  ['Netflix', '219', 'suscripciones', '', 'tarjeta_credito', 'mensual', '1', 'Banamex', '5678', 'servicio', 'no', '', '', 'no', '3'],
  ['Renta', '8500', 'hogar', '', 'transferencia', 'mensual', '5', 'BBVA', '', 'servicio', 'no', '', '', 'si', '5'],
  ['TDC BBVA', '5000', 'deudas', '', 'tarjeta_debito', 'mensual', '', 'BBVA', '1234', 'credito', 'si', '15', '20', 'si', '3'],
  ['Seguro auto', '1200', 'seguros', '', 'transferencia', 'mensual', '10', '', '', 'servicio', 'no', '', '', 'si', '7'],
];

function downloadTemplate(memberName: string) {
  const rows = CSV_EXAMPLE_ROWS.map((r) => {
    const row = [...r];
    row[3] = memberName; // quien_paga
    return row;
  });
  const csv = [CSV_HEADERS, ...rows]
    .map((r) => r.map((c) => (c.includes(',') ? `"${c}"` : c)).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gastos_fijos_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type ParsedRow = Omit<FixedExpenseTemplate, 'id' | 'createdAt'> & { _selected: boolean };

interface Props {
  members: SpaceMember[];
  apiKey?: string;
  onImport: (templates: Omit<FixedExpenseTemplate, 'id' | 'createdAt'>[]) => void;
}

export function FixedExpenseBulkImport({ members, apiKey, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const memberNames = members.map((m) => m.name);
  const defaultMember = memberNames[0] ?? '';

  const memberColor = (name: string) => {
    const m = members.find((mem) => mem.name === name);
    return m ? MEMBER_COLORS[m.colorIndex] : '#9ca3af';
  };

  const handleFile = async (f: File) => {
    if (!apiKey) {
      setError('Se requiere una API Key de Anthropic en Ajustes para interpretar el archivo.');
      return;
    }
    setFile(f);
    setError('');
    setRows([]);
    setLoading(true);
    try {
      const text = await f.text();
      const parsed = await parseFixedExpensesFromCSV(text, apiKey, memberNames);
      const mapped: ParsedRow[] = parsed.map((p) => ({
        concept:                String(p.concept ?? ''),
        expectedAmount:         Number(p.expectedAmount ?? 0),
        category:               (p.category as Category) ?? 'otro',
        paidBy:                 String(p.paidBy ?? defaultMember),
        paymentMethod:          (p.paymentMethod as PaymentMethod) ?? 'transferencia',
        frequency:              (p.frequency as Frequency) ?? 'mensual',
        dayOfMonth:             p.dayOfMonth ? Number(p.dayOfMonth) : undefined,
        bank:                   p.bank ? String(p.bank) : undefined,
        cardLast4:              p.cardLast4 ? String(p.cardLast4) : undefined,
        fixedExpenseType:       (p.fixedExpenseType as FixedExpenseType) ?? 'servicio',
        isCreditCard:           Boolean(p.isCreditCard),
        cutDay:                 p.cutDay ? Number(p.cutDay) : undefined,
        paymentDueDaysAfterCut: p.paymentDueDaysAfterCut ? Number(p.paymentDueDaysAfterCut) : undefined,
        reminderEnabled:        Boolean(p.reminderEnabled),
        reminderDaysBefore:     Number(p.reminderDaysBefore ?? 3),
        active:                 true,
        _selected:              true,
      }));
      setRows(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error al interpretar el archivo: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, _selected: !row._selected } : row));

  const selectedCount = rows.filter((r) => r._selected).length;

  const handleImport = () => {
    const toImport = rows.filter((r) => r._selected).map(({ _selected, ...rest }) => rest);
    onImport(toImport);
    setOpen(false);
    setRows([]);
    setFile(null);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-all"
      >
        <Upload size={13} />
        Carga masiva desde Excel/CSV
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-3 space-y-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
          {/* Instructions */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-700">¿Cómo funciona?</p>
            <ol className="text-xs text-gray-500 space-y-0.5 list-decimal list-inside">
              <li>Descarga el template CSV y llénalo en Excel</li>
              <li>Guárdalo como CSV y súbelo aquí</li>
              <li>La IA interpreta tu archivo (acepta cualquier formato)</li>
              <li>Revisa y confirma los gastos antes de importar</li>
            </ol>
          </div>

          {/* Template download */}
          <button
            type="button"
            onClick={() => downloadTemplate(defaultMember)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-all"
          >
            <Download size={13} />
            Descargar template CSV
          </button>

          {/* Column reference */}
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer font-semibold text-gray-600 select-none">Ver columnas del template</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {CSV_HEADERS.map((h) => (
                      <th key={h} className="border border-gray-200 px-1.5 py-1 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-1.5 py-1 whitespace-nowrap">Netflix</td>
                    <td className="border border-gray-200 px-1.5 py-1">219</td>
                    <td className="border border-gray-200 px-1.5 py-1">suscripciones</td>
                    <td className="border border-gray-200 px-1.5 py-1">{defaultMember}</td>
                    <td className="border border-gray-200 px-1.5 py-1">tarjeta_credito</td>
                    <td className="border border-gray-200 px-1.5 py-1">mensual</td>
                    <td className="border border-gray-200 px-1.5 py-1">1</td>
                    <td className="border border-gray-200 px-1.5 py-1">Banamex</td>
                    <td className="border border-gray-200 px-1.5 py-1">5678</td>
                    <td className="border border-gray-200 px-1.5 py-1">servicio</td>
                    <td className="border border-gray-200 px-1.5 py-1">no</td>
                    <td className="border border-gray-200 px-1.5 py-1"></td>
                    <td className="border border-gray-200 px-1.5 py-1"></td>
                    <td className="border border-gray-200 px-1.5 py-1">no</td>
                    <td className="border border-gray-200 px-1.5 py-1">3</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-gray-400">
              Categorías: alimentacion, transporte, hogar, salud, educacion, entretenimiento, ropa, servicios, seguros, suscripciones, viajes, restaurantes, mascotas, belleza, inversiones, deudas, otro<br />
              tipo: servicio | credito · frecuencia: diario | semanal | quincenal | mensual | bimestral | trimestral | semestral | anual
            </p>
          </details>

          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="border-2 border-dashed border-teal-200 rounded-xl p-4 text-center cursor-pointer hover:bg-teal-50 transition-all"
          >
            <Upload size={20} className="mx-auto text-teal-400 mb-1" />
            <p className="text-xs font-semibold text-gray-600">
              {file ? file.name : 'Arrastra tu CSV aquí o toca para seleccionar'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Acepta cualquier formato CSV — la IA lo interpreta automáticamente</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-teal-700">
              <Loader2 size={16} className="animate-spin" />
              Interpretando archivo con IA…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Review table */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">
                  {rows.length} gasto{rows.length !== 1 ? 's' : ''} detectado{rows.length !== 1 ? 's' : ''} &mdash; {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
                </p>
                <button type="button" onClick={() => setRows((r) => r.map((row) => ({ ...row, _selected: !r.every((x) => x._selected) })))}
                  className="text-xs text-teal-600 font-semibold">
                  {rows.every((r) => r._selected) ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {rows.map((row, i) => (
                  <div key={i} className={`rounded-xl border transition-all ${row._selected ? 'border-teal-200 bg-teal-50' : 'border-gray-200 bg-white opacity-60'}`}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input type="checkbox" checked={row._selected} onChange={() => toggleSelect(i)}
                        className="w-4 h-4 accent-teal-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-800 truncate">{row.concept}</span>
                          <span className="text-xs text-teal-700 font-bold">${row.expectedAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1">{FREQ_LABELS[row.frequency]}</span>
                          {row.isCreditCard && <span className="text-[10px] text-orange-600 bg-orange-50 rounded px-1">💳 TC</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-400">{CATEGORIES[row.category as Category]?.replace(/^[^ ]+ /, '') ?? row.category}</span>
                          {row.paidBy && (
                            <span className="flex items-center gap-0.5">
                              <span className="w-3 h-3 rounded-full inline-flex items-center justify-center text-white font-bold flex-shrink-0"
                                style={{ backgroundColor: memberColor(row.paidBy), fontSize: '7px' }}>
                                {row.paidBy.slice(0, 1).toUpperCase()}
                              </span>
                              <span className="text-[10px] text-gray-400">{row.paidBy}</span>
                            </span>
                          )}
                          {row.paymentMethod && (
                            <span className="text-[10px] text-gray-400">{PAYMENT_METHODS[row.paymentMethod as PaymentMethod]?.replace(/^[^ ]+ /, '') ?? row.paymentMethod}</span>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                        className="shrink-0 text-gray-400 hover:text-gray-600">
                        {expandedRow === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {expandedRow === i && (
                      <div className="px-3 pb-2 pt-0 border-t border-gray-100 text-[11px] text-gray-500 grid grid-cols-2 gap-x-4 gap-y-0.5">
                        {row.dayOfMonth && <span>Día de pago: {row.dayOfMonth}</span>}
                        {row.bank && <span>Banco: {row.bank}</span>}
                        {row.cardLast4 && <span>Tarjeta: ···{row.cardLast4}</span>}
                        {row.isCreditCard && row.cutDay && <span>Corte: día {row.cutDay}</span>}
                        {row.isCreditCard && row.paymentDueDaysAfterCut && <span>Límite: {row.paymentDueDaysAfterCut} días post-corte</span>}
                        {row.reminderEnabled && <span>Recordatorio: {row.reminderDaysBefore} días antes</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleImport}
                className="w-full py-2.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
                style={{ backgroundColor: 'var(--soi-teal)' }}
              >
                <Check size={15} />
                Importar {selectedCount} gasto{selectedCount !== 1 ? 's' : ''} fijo{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          <button type="button" onClick={() => { setOpen(false); setRows([]); setFile(null); setError(''); }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X size={12} />
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
