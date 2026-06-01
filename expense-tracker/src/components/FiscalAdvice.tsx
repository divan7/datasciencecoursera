import { useState } from 'react';
import { Receipt, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { Expense } from '../types/expense';
import type { FiscalProfile, FiscalAnalysis } from '../types/fiscal';
import { CFDI_USES } from '../types/fiscal';
import { checkDeductibility } from '../utils/fiscalRules';
import { analyzeTicketFiscal } from '../services/claudeService';

// Minimal shape needed — works pre-save (no id) and post-save (with id)
export type FiscalExpenseSlim = Pick<Expense, 'concept' | 'amount' | 'category'> & {
  id?: string;
  transactionType?: Expense['transactionType'];
  invoiceStatus?: Expense['invoiceStatus'];
};

interface Props {
  expenses: FiscalExpenseSlim[];              // all expenses from this ticket
  ticketImage?: string;                       // base64 image (if available)
  ticketMediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  profile: FiscalProfile;
  apiKey?: string;
  /** Called when the user marks invoice status. Only fires when expenses have ids. */
  onMarkInvoiced?: (expenseIds: string[], status: Expense['invoiceStatus']) => void;
  /** Called in pre-save mode so parent can attach invoiceStatus to the saved expenses */
  onDecide?: (status: Expense['invoiceStatus']) => void;
}

export function FiscalAdvice({ expenses, ticketImage, ticketMediaType, profile, apiKey, onMarkInvoiced, onDecide }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<FiscalAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gastos = expenses.filter((e) => (e.transactionType ?? 'gasto') !== 'ingreso');
  if (gastos.length === 0) return null;

  // Quick rule-based check (always available)
  const ruleResults = gastos.map((e) => ({ expense: e, ...checkDeductibility(e as Expense, profile) }));
  const anyDeductible = ruleResults.some((r) => r.isDeductible);

  const runAIAnalysis = async () => {
    if (!apiKey || !ticketImage || !ticketMediaType) return;
    setLoading(true);
    setError('');
    try {
      const res = await analyzeTicketFiscal(
        ticketImage,
        ticketMediaType,
        apiKey,
        profile,
        gastos.map((e) => ({ concept: e.concept, amount: e.amount, category: e.category })),
      );
      setAnalysis(res);
    } catch (err) {
      setError('No se pudo analizar el ticket. Verifica tu clave de API.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAll = (status: Expense['invoiceStatus']) => {
    if (onMarkInvoiced) {
      const ids = gastos.map((e) => e.id).filter(Boolean) as string[];
      if (ids.length > 0) onMarkInvoiced(ids, status);
    }
    if (onDecide) onDecide(status);
  };

  const totalAmount = gastos.reduce((s, e) => s + e.amount, 0);
  const invoiceStatuses = gastos.map((e) => e.invoiceStatus);
  const allInvoiced = invoiceStatuses.every((s) => s === 'invoiced');
  const anyPending = invoiceStatuses.some((s) => s === 'pending' || !s);

  const StatusIcon = analysis?.isActualInvoice
    ? CheckCircle
    : analysis?.isFacturatable || anyDeductible
    ? AlertCircle
    : XCircle;

  const statusColor = analysis?.isActualInvoice
    ? 'text-green-600'
    : analysis?.isFacturatable || anyDeductible
    ? 'text-amber-600'
    : 'text-gray-400';

  const headerLabel = analysis?.isActualInvoice
    ? '✅ Factura CFDI detectada'
    : analysis?.isFacturatable
    ? '🧾 Facturable — solicita tu CFDI'
    : anyDeductible
    ? '🧾 Posiblemente facturable'
    : '📄 Ticket no facturable';

  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/40 overflow-hidden mt-3">
      {/* Summary header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors"
      >
        <StatusIcon size={16} className={`flex-shrink-0 ${statusColor}`} />
        <span className="flex-1 text-sm font-semibold text-teal-800 text-left">{headerLabel}</span>
        <span className="text-xs text-teal-600 font-medium">
          ${totalAmount.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
        </span>
        {expanded ? <ChevronUp size={14} className="text-teal-400" /> : <ChevronDown size={14} className="text-teal-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-teal-100">

          {/* AI analysis result */}
          {analysis && (
            <div className="mt-3 space-y-2">
              {analysis.isActualInvoice && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-800 mb-1">✅ Factura CFDI válida</p>
                  {analysis.cfdiUUID && (
                    <p className="text-xs text-green-700">UUID: <span className="font-mono">{analysis.cfdiUUID}</span></p>
                  )}
                  {analysis.vendorRfc && (
                    <p className="text-xs text-green-700">RFC emisor: <span className="font-mono">{analysis.vendorRfc}</span></p>
                  )}
                  {analysis.cfdiValidIssues && analysis.cfdiValidIssues.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-amber-700">Observaciones:</p>
                      {analysis.cfdiValidIssues.map((issue, i) => (
                        <p key={i} className="text-xs text-amber-600">• {issue}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!analysis.isActualInvoice && (
                <>
                  <div className={`rounded-xl p-3 ${analysis.isDeductible ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {analysis.isDeductible
                        ? <CheckCircle size={13} className="text-amber-600" />
                        : <XCircle size={13} className="text-gray-400" />}
                      <p className={`text-xs font-bold ${analysis.isDeductible ? 'text-amber-800' : 'text-gray-600'}`}>
                        {analysis.isDeductible ? 'Gasto deducible en tu régimen' : 'No deducible en tu régimen'}
                      </p>
                    </div>
                    {analysis.suggestedCfdiUse && (
                      <p className="text-xs text-amber-700">
                        Uso CFDI: <span className="font-semibold">{analysis.suggestedCfdiUse}</span>
                        {' — '}{CFDI_USES[analysis.suggestedCfdiUse as keyof typeof CFDI_USES]}
                      </p>
                    )}
                    {analysis.deductionLimit && (
                      <p className="text-xs text-amber-600 mt-0.5">Límite: {analysis.deductionLimit}</p>
                    )}
                    {analysis.estimatedDeduction != null && (
                      <p className="text-xs text-amber-700 mt-0.5 font-semibold">
                        Deducción estimada: ${analysis.estimatedDeduction.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  {analysis.vendorName && (
                    <p className="text-xs text-gray-600">
                      Establecimiento: <span className="font-semibold">{analysis.vendorName}</span>
                      {analysis.vendorRfc && <> · RFC: <span className="font-mono">{analysis.vendorRfc}</span></>}
                    </p>
                  )}

                  {analysis.howToInvoice && analysis.isFacturatable && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-gray-700 mb-1">📋 Cómo solicitar la factura:</p>
                      <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{analysis.howToInvoice}</p>
                    </div>
                  )}
                </>
              )}

              <p className="text-xs text-gray-500 italic">{analysis.reasoning}</p>
            </div>
          )}

          {/* Rule-based results (shown when no AI analysis yet) */}
          {!analysis && (
            <div className="mt-3 space-y-1.5">
              {ruleResults.map(({ expense, isDeductible, reasoning, suggestedCfdiUse }) => (
                <div key={expense.id} className="flex items-start gap-2">
                  {isDeductible
                    ? <CheckCircle size={13} className="text-teal-600 flex-shrink-0 mt-0.5" />
                    : <XCircle size={13} className="text-gray-300 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-700 truncate block">{expense.concept}</span>
                    {isDeductible && suggestedCfdiUse && (
                      <span className="text-[10px] text-teal-600">CFDI: {suggestedCfdiUse}</span>
                    )}
                    {!isDeductible && (
                      <span className="text-[10px] text-gray-400">{reasoning.slice(0, 80)}…</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI analysis button */}
          {ticketImage && apiKey && !analysis && (
            <button
              type="button"
              onClick={runAIAnalysis}
              disabled={loading}
              className="w-full py-2 rounded-xl bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <><Loader2 size={13} className="animate-spin" /> Analizando…</> : '🔍 Analizar con IA'}
            </button>
          )}
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          {/* Invoice status actions */}
          <div className="flex gap-2 pt-1">
            {!allInvoiced && (
              <button
                type="button"
                onClick={() => markAll('invoiced')}
                className="flex-1 py-2 rounded-xl border border-green-300 bg-green-50 text-green-700 text-xs font-semibold"
              >
                ✅ Pude facturar
              </button>
            )}
            {anyPending && (
              <button
                type="button"
                onClick={() => markAll('skipped')}
                className="flex-1 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-xs font-semibold"
              >
                Omitir / No facturé
              </button>
            )}
            {allInvoiced && (
              <div className="flex-1 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold text-center">
                ✅ Facturado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
