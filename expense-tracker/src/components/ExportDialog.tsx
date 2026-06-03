import { useState, useEffect, useMemo } from 'react';
import { X, Download, Loader2, FileText, Image } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Expense } from '../types/expense';
import { CATEGORIES } from '../types/expense';
import type { AppSpace } from '../types/space';
import { loadExpenses } from '../utils/storage';
import { expensesDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';

interface ExportDialogProps {
  spaces: AppSpace[];
  currentSpaceId: string;
  currentExpenses: Expense[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'pdf';
type PhotoOption = 'none' | 'same' | 'separate';

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return format(new Date(parseInt(y), parseInt(mo) - 1, 1), 'MMMM yyyy', { locale: es })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatAmount(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

async function generatePDF(
  rows: (Expense & { spaceName: string })[],
  effectiveFrom: string,
  effectiveTo: string,
  photoOption: PhotoOption,
) {
  const { jsPDF } = await import('jspdf');

  const periodLabel = effectiveFrom === effectiveTo
    ? monthLabel(effectiveFrom)
    : `${monthLabel(effectiveFrom)} – ${monthLabel(effectiveTo)}`;

  const suffix = effectiveFrom === effectiveTo ? effectiveFrom : `${effectiveFrom}_${effectiveTo}`;
  const photosRows = rows.filter((e) => !!e.receiptImageBase64);

  const TEAL: [number, number, number] = [20, 150, 140];
  const GRAY_HEADER: [number, number, number] = [245, 246, 247];
  const GRAY_LINE: [number, number, number] = [220, 222, 226];
  const TEXT_DARK: [number, number, number] = [30, 30, 30];
  const TEXT_MID: [number, number, number] = [90, 90, 90];

  // ── Expense table section ──────────────────────────────────────────────────
  const addExpenseTable = (doc: InstanceType<typeof jsPDF>, startPage = true) => {
    if (!startPage) doc.addPage('a4', 'landscape');
    const PW = 297; // landscape A4
    const PH = 210;
    const ML = 12, MR = 12, MT = 14;

    // Title bar (first page only within this section)
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, PW, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('Gastos y registros', ML, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(periodLabel, PW - MR, 10, { align: 'right' });

    const cols = [
      { header: 'Fecha',      key: 'date',           w: 22 },
      { header: 'Lista',      key: 'spaceName',       w: 30 },
      { header: 'Concepto',   key: 'concept',         w: 52 },
      { header: 'Categoría',  key: 'category',        w: 28 },
      { header: 'Tipo',       key: 'transactionType', w: 14 },
      { header: 'Forma pago', key: 'paymentMethod',   w: 26 },
      { header: 'Quién',      key: 'paidBy',          w: 20 },
      { header: 'Monto',      key: 'amount',          w: 26, align: 'right' as const },
    ];
    const totalW = cols.reduce((s, c) => s + c.w, 0);
    const scale = (PW - ML - MR) / totalW;
    const scaledCols = cols.map((c) => ({ ...c, w: c.w * scale }));
    const ROW_H = 7, HEADER_H = 8;
    let y = MT + 6;

    const drawTableHeader = () => {
      let x = ML;
      doc.setFillColor(...GRAY_HEADER);
      doc.rect(ML, y, PW - ML - MR, HEADER_H, 'F');
      doc.setDrawColor(...GRAY_LINE);
      doc.setLineWidth(0.1);
      doc.line(ML, y + HEADER_H, PW - MR, y + HEADER_H);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...TEXT_DARK);
      for (const col of scaledCols) {
        const tx = col.align === 'right' ? x + col.w - 1 : x + 1;
        doc.text(col.header, tx, y + 5.5, { align: col.align === 'right' ? 'right' : 'left' });
        x += col.w;
      }
      y += HEADER_H;
    };

    drawTableHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);

    const pmLabel: Record<string, string> = {
      efectivo: 'Efectivo', tarjeta_debito: 'Débito',
      tarjeta_credito: 'Crédito', transferencia: 'Transferencia', otro: 'Otro',
    };

    rows.forEach((e, i) => {
      if (y + ROW_H > PH - 10) {
        doc.addPage('a4', 'landscape');
        y = MT;
        drawTableHeader();
      }
      if (i % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(ML, y, PW - ML - MR, ROW_H, 'F');
      }
      const isIncome = e.transactionType === 'ingreso';
      const catLabel = (CATEGORIES[e.category] ?? e.category).replace(/^\S+\s/, '');
      const values: Record<string, string> = {
        date: e.date, spaceName: e.spaceName, concept: e.concept,
        category: catLabel, transactionType: isIncome ? 'Ingreso' : 'Gasto',
        paymentMethod: pmLabel[e.paymentMethod] ?? e.paymentMethod,
        paidBy: e.paidBy, amount: formatAmount(e.amount),
      };
      let x = ML;
      for (const col of scaledCols) {
        const v = values[col.key] ?? '';
        const maxChars = Math.floor(col.w / 1.7);
        const txt = v.length > maxChars ? v.slice(0, maxChars - 1) + '…' : v;
        if (col.key === 'amount') {
          doc.setTextColor(isIncome ? 15 : 180, isIncome ? 120 : 40, isIncome ? 90 : 40);
        } else {
          doc.setTextColor(...TEXT_MID);
        }
        const tx = col.align === 'right' ? x + col.w - 1 : x + 1;
        doc.text(txt, tx, y + 4.8, { align: col.align === 'right' ? 'right' : 'left' });
        x += col.w;
      }
      doc.setDrawColor(...GRAY_LINE);
      doc.setLineWidth(0.05);
      doc.line(ML, y + ROW_H, PW - MR, y + ROW_H);
      y += ROW_H;
    });
  };

  // ── Photo pages section ────────────────────────────────────────────────────
  const addPhotoPages = (doc: InstanceType<typeof jsPDF>, photos: (Expense & { spaceName: string })[]) => {
    photos.forEach((e) => {
      doc.addPage('a4', 'portrait');
      const PW = 210, PH = 297;
      doc.setFillColor(...TEAL);
      doc.rect(0, 0, PW, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      const conceptTxt = e.concept.length > 38 ? e.concept.slice(0, 37) + '…' : e.concept;
      doc.text(conceptTxt, 12, 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${e.date}  •  ${e.spaceName}  •  ${formatAmount(e.amount)}`, 12, 14);
      const imgData = e.receiptImageBase64!;
      const fmt = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      try {
        doc.addImage(imgData, fmt, 12, 22, PW - 24, PH - 32, undefined, 'FAST');
      } catch {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('(No se pudo cargar la imagen)', PW / 2, PH / 2, { align: 'center' });
      }
    });
  };

  // ── Stamp page numbers ─────────────────────────────────────────────────────
  const stampPageNumbers = (doc: InstanceType<typeof jsPDF>) => {
    const total = doc.getNumberOfPages();
    const ts = format(new Date(), 'dd/MM/yyyy HH:mm');
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(160, 160, 160);
      doc.text(`Página ${p} de ${total}`, PW / 2, PH - 4, { align: 'center' });
      doc.text(`Generado ${ts}`, PW - 12, PH - 4, { align: 'right' });
    }
  };

  // ── Build & save ───────────────────────────────────────────────────────────
  if (photoOption === 'separate') {
    // Main expenses PDF
    const expDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    addExpenseTable(expDoc, true);
    stampPageNumbers(expDoc);
    expDoc.save(`gastos_${suffix}.pdf`);

    // Separate photos PDF
    if (photosRows.length > 0) {
      const photoDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      // First photo on first page (avoid blank first page)
      const first = photosRows[0];
      const PW = 210, PH = 297;
      photoDoc.setFillColor(...TEAL);
      photoDoc.rect(0, 0, PW, 18, 'F');
      photoDoc.setFont('helvetica', 'bold');
      photoDoc.setFontSize(10);
      photoDoc.setTextColor(255, 255, 255);
      const ct = first.concept.length > 38 ? first.concept.slice(0, 37) + '…' : first.concept;
      photoDoc.text(ct, 12, 8);
      photoDoc.setFont('helvetica', 'normal');
      photoDoc.setFontSize(8);
      photoDoc.text(`${first.date}  •  ${first.spaceName}  •  ${formatAmount(first.amount)}`, 12, 14);
      const fmt0 = first.receiptImageBase64!.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      try { photoDoc.addImage(first.receiptImageBase64!, fmt0, 12, 22, PW - 24, PH - 32, undefined, 'FAST'); }
      catch { /* skip */ }
      addPhotoPages(photoDoc, photosRows.slice(1));
      stampPageNumbers(photoDoc);
      photoDoc.save(`fotos_${suffix}.pdf`);
    }
  } else {
    // Single PDF (with or without photos appended)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    addExpenseTable(doc, true);
    if (photoOption === 'same' && photosRows.length > 0) {
      addPhotoPages(doc, photosRows);
    }
    stampPageNumbers(doc);
    doc.save(`gastos_${suffix}.pdf`);
  }
}

export function ExportDialog({ spaces, currentSpaceId, currentExpenses, onClose }: ExportDialogProps) {
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<Set<string>>(new Set([currentSpaceId]));
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({ [currentSpaceId]: currentExpenses });
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [photoOption, setPhotoOption] = useState<PhotoOption>('none');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (spaces.length <= 1) return;
    const load = async () => {
      setLoadingSpaces(true);
      const result: Record<string, Expense[]> = { [currentSpaceId]: currentExpenses };
      for (const space of spaces) {
        if (space.id === currentSpaceId) continue;
        result[space.id] = loadExpenses(space.id);
        if (isSupabaseConfigured) {
          try {
            const remote = await expensesDb.list(space.id);
            if (remote.length > 0) result[space.id] = remote;
          } catch { /* keep local */ }
        }
      }
      setAllExpenses(result);
      setLoadingSpaces(false);
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allAvailableMonths = useMemo(() => {
    const months = new Set<string>();
    Object.values(allExpenses).flat().forEach((e) => months.add(e.date.slice(0, 7)));
    months.add(format(new Date(), 'yyyy-MM'));
    return [...months].sort().reverse();
  }, [allExpenses]);

  useEffect(() => {
    if (allAvailableMonths.length === 0) return;
    setToMonth((prev) => prev || allAvailableMonths[0]);
    setFromMonth((prev) => prev || allAvailableMonths[allAvailableMonths.length - 1]);
  }, [allAvailableMonths]);

  const toggleSpace = (spaceId: string) => {
    setSelectedSpaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId) && next.size > 1) next.delete(spaceId);
      else next.add(spaceId);
      return next;
    });
  };

  const effectiveFrom = fromMonth <= toMonth ? fromMonth : toMonth;
  const effectiveTo   = fromMonth <= toMonth ? toMonth  : fromMonth;

  const filteredRows = useMemo(() => {
    if (!effectiveFrom || !effectiveTo) return [];
    const rows: (Expense & { spaceName: string })[] = [];
    for (const id of selectedSpaceIds) {
      const spaceName = spaces.find((s) => s.id === id)?.name ?? id;
      (allExpenses[id] ?? [])
        .filter((e) => { const m = e.date.slice(0, 7); return m >= effectiveFrom && m <= effectiveTo; })
        .forEach((e) => rows.push({ ...e, spaceName }));
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [selectedSpaceIds, allExpenses, effectiveFrom, effectiveTo, spaces]);

  const exportedCount = filteredRows.length;
  const photosCount = filteredRows.filter((e) => !!e.receiptImageBase64).length;

  const handleExport = async () => {
    if (exportedCount === 0 || exporting) return;

    if (exportFormat === 'csv') {
      const headers = [
        'Lista', 'Fecha', 'Tipo', 'Concepto', 'Monto', 'Categoría',
        'Quién pagó', 'Forma de pago', 'Tarjeta', 'Banco', 'Establecimiento',
        'Tipo gasto', 'Frecuencia', 'MSI', 'Reembolsable', 'Deducible',
        'Factura', 'Compartido', 'Notas',
      ];
      const data = filteredRows.map((e) => [
        e.spaceName, e.date, e.transactionType, e.concept, e.amount,
        CATEGORIES[e.category] ?? e.category, e.paidBy, e.paymentMethod,
        e.cardLast4 ?? '', e.bank ?? '', e.store ?? '',
        e.expenseType, e.frequency ?? '', e.installments ?? '',
        e.isReimbursable ? 'Sí' : 'No', e.isTaxDeductible ? 'Sí' : 'No',
        e.invoiceRequested ? 'Sí' : 'No', e.sharedExpense ? 'Sí' : 'No',
        e.notes ?? '',
      ]);
      const csv = [headers, ...data].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = effectiveFrom === effectiveTo ? effectiveFrom : `${effectiveFrom}_${effectiveTo}`;
      a.download = `gastos_${suffix}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } else {
      setExporting(true);
      try {
        await generatePDF(filteredRows, effectiveFrom, effectiveTo, photoOption);
      } finally {
        setExporting(false);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-teal-600" />
            <h2 className="text-base font-bold text-gray-900">Exportar gastos</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Space selection */}
          {spaces.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Listas a incluir</p>
              <div className="space-y-2">
                {spaces.map((space) => (
                  <label key={space.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedSpaceIds.has(space.id)}
                      onChange={() => toggleSpace(space.id)}
                      className="w-4 h-4 accent-teal-600"
                    />
                    <span className="text-sm font-medium text-gray-700 flex-1">
                      {space.id === currentSpaceId ? `★ ${space.name}` : space.name}
                    </span>
                    {loadingSpaces && space.id !== currentSpaceId
                      ? <Loader2 size={12} className="text-gray-400 animate-spin" />
                      : <span className="text-xs text-gray-400">{(allExpenses[space.id] ?? []).length} registros</span>
                    }
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Período</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Desde</label>
                <select
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-300 bg-white"
                >
                  {allAvailableMonths.map((m) => (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hasta</label>
                <select
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-300 bg-white"
                >
                  {allAvailableMonths.map((m) => (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Format selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Formato</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  exportFormat === 'csv'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText size={15} />
                CSV (Excel)
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  exportFormat === 'pdf'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Image size={15} />
                PDF
              </button>
            </div>
          </div>

          {/* Photo options (PDF only) */}
          {exportFormat === 'pdf' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500">Fotos de tickets</p>
                {photosCount > 0 && (
                  <span className="text-xs text-teal-600 font-medium">{photosCount} con foto</span>
                )}
              </div>
              {photosCount === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay fotos en los registros seleccionados</p>
              ) : (
                <div className="space-y-2">
                  {([
                    { value: 'none',     label: 'Sin fotos',             desc: 'Solo tabla de gastos' },
                    { value: 'same',     label: 'En el mismo PDF',       desc: 'Tabla + fotos al final' },
                    { value: 'separate', label: 'PDF separado',          desc: 'Descarga dos archivos' },
                  ] as { value: PhotoOption; label: string; desc: string }[]).map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="photoOption"
                        checked={photoOption === opt.value}
                        onChange={() => setPhotoOption(opt.value)}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                        <span className="text-xs text-gray-400 ml-2">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="bg-teal-50 rounded-xl px-4 py-3">
            <p className="text-sm text-teal-800">
              <span className="font-bold">{exportedCount}</span> registro{exportedCount !== 1 ? 's' : ''} a exportar
              {exportFormat === 'pdf' && photosCount > 0 && photoOption !== 'none' && (
                <span className="text-teal-600"> · {photosCount} foto{photosCount !== 1 ? 's' : ''}</span>
              )}
            </p>
            {effectiveFrom && effectiveTo && (
              <p className="text-xs text-teal-600 mt-0.5">
                {effectiveFrom === effectiveTo ? monthLabel(effectiveFrom) : `${monthLabel(effectiveFrom)} — ${monthLabel(effectiveTo)}`}
              </p>
            )}
            {exportFormat === 'pdf' && photoOption === 'separate' && photosCount > 0 && (
              <p className="text-xs text-teal-600 mt-1">Se descargarán 2 archivos PDF</p>
            )}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exportedCount === 0 || exporting}
            className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
            style={{ backgroundColor: 'var(--soi-teal)' }}
          >
            {exporting ? (
              <><Loader2 size={16} className="animate-spin" /> Generando PDF…</>
            ) : (
              <><Download size={16} /> Descargar {exportFormat.toUpperCase()}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
