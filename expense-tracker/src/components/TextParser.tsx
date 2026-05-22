import { useState } from 'react';
import { Sparkles, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, User, Category, PaymentMethod } from '../types/expense';
import { CATEGORIES, PAYMENT_METHODS } from '../types/expense';
import { parseExpenseFromText } from '../services/claudeService';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';
import { QuickForm } from './QuickForm';

interface TextParserProps {
  currentUser: User;
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  apiKey?: string;
  members: SpaceMember[];
}

const EXAMPLES = [
  'Pagué 350 pesos en Walmart con débito BBVA',
  'Netflix 219 crédito Banamex 5678 mensual',
  'Gasolina 800 efectivo Pemex lunes',
  'Comida 420 en restaurante La Paloma, tarjeta terminación 1234',
];

interface ConfirmFields {
  amount: string;
  concept: string;
  category: string;
  paymentMethod: string;
  paidBy: string;
}

interface DetectedFlags {
  amount: boolean;
  concept: boolean;
  category: boolean;
  paymentMethod: boolean;
  paidBy: boolean;
}

export function TextParser({ currentUser, onSave, apiKey, members }: TextParserProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawParsed, setRawParsed] = useState<Partial<Expense> | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmFields | null>(null);
  const [detected, setDetected] = useState<DetectedFlags | null>(null);
  const [showQuickForm, setShowQuickForm] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) return;
    if (!apiKey) {
      setError('Configura tu API Key de Anthropic en ajustes para usar esta función.');
      return;
    }

    setLoading(true);
    setError('');
    setRawParsed(null);
    setConfirmed(null);
    setDetected(null);
    setShowQuickForm(false);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await parseExpenseFromText(text, apiKey, today);
      const withUser = { ...result, paidBy: result.paidBy ?? currentUser };
      setRawParsed(withUser);

      // Determine which fields were detected vs missing
      const flags: DetectedFlags = {
        amount: !!result.amount && result.amount > 0,
        concept: !!result.concept && result.concept.trim() !== '',
        category: !!result.category,
        paymentMethod: !!result.paymentMethod,
        paidBy: !!result.paidBy,
      };
      setDetected(flags);
      setConfirmed({
        amount: result.amount ? String(result.amount) : '',
        concept: result.concept ?? '',
        category: result.category ?? 'otro',
        paymentMethod: result.paymentMethod ?? 'tarjeta_debito',
        paidBy: result.paidBy ?? currentUser,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('authentication') || msg.includes('invalid x-api-key')) {
        setError('API Key inválida. Verifica que la copiaste correctamente en Ajustes.');
      } else if (msg.includes('credit') || msg.includes('billing') || msg.includes('402')) {
        setError('Sin créditos en tu cuenta Anthropic. Agrega créditos en console.anthropic.com.');
      } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        setError('Error de red. Verifica tu conexión a internet.');
      } else {
        setError(`Error: ${msg}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  const handleContinue = () => {
    if (!confirmed || !rawParsed) return;
    setShowQuickForm(true);
  };

  const handleSaveAndReset = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    onSave(data);
    setRawParsed(null);
    setConfirmed(null);
    setDetected(null);
    setShowQuickForm(false);
    setText('');
  };

  const canContinue = confirmed && confirmed.amount.trim() !== '' && parseFloat(confirmed.amount) > 0 && confirmed.concept.trim() !== '';

  // Build prefill from confirmed data merged with raw
  const prefill: Partial<Expense> | undefined = rawParsed && confirmed ? {
    ...rawParsed,
    amount: parseFloat(confirmed.amount) || rawParsed.amount,
    concept: confirmed.concept || rawParsed.concept,
    category: confirmed.category as Category || rawParsed.category,
    paymentMethod: confirmed.paymentMethod as PaymentMethod || rawParsed.paymentMethod,
    paidBy: confirmed.paidBy || rawParsed.paidBy,
  } : undefined;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-50 to-teal-50 rounded-2xl p-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-purple-500" />
          <p className="text-sm font-semibold text-purple-700">IA analiza tu texto</p>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Escribe el gasto en lenguaje natural. La IA extrae automáticamente monto, categoría, forma de pago y más.
        </p>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Pagué 350 en Walmart con débito BBVA..."
            rows={3}
            className="w-full px-3 py-2 pr-12 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-white"
          />
          <button
            onClick={handleParse}
            disabled={loading || !text.trim()}
            className="absolute right-2 bottom-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-all active:scale-95"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>

        {/* Examples */}
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-2">Ejemplos rápidos:</p>
          <div className="flex flex-wrap gap-1">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                className="px-2 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-600 hover:bg-purple-50 transition-all"
              >
                {ex.length > 35 ? ex.slice(0, 35) + '…' : ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Confirmation step */}
      {rawParsed && confirmed && detected && !showQuickForm && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
            <p className="text-sm font-bold text-purple-800">Datos detectados — confirma antes de continuar</p>
            <p className="text-xs text-purple-500 mt-0.5">Los campos en amarillo necesitan tu atención</p>
          </div>
          <div className="p-4 space-y-3">
            {/* Amount */}
            <ConfirmRow
              label="Monto"
              detected={detected.amount}
              detectedDisplay={detected.amount ? `$${rawParsed.amount?.toLocaleString('es-MX') ?? ''}` : undefined}
            >
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={confirmed.amount}
                onChange={(e) => setConfirmed((c) => c ? { ...c, amount: e.target.value } : c)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </ConfirmRow>

            {/* Concept */}
            <ConfirmRow
              label="Concepto"
              detected={detected.concept}
              detectedDisplay={detected.concept ? rawParsed.concept : undefined}
            >
              <input
                type="text"
                value={confirmed.concept}
                onChange={(e) => setConfirmed((c) => c ? { ...c, concept: e.target.value } : c)}
                placeholder="¿En qué se gastó?"
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </ConfirmRow>

            {/* Category */}
            <ConfirmRow
              label="Categoría"
              detected={detected.category}
              detectedDisplay={detected.category ? (CATEGORIES[rawParsed.category as Category] as string ?? rawParsed.category) : undefined}
            >
              <select
                value={confirmed.category}
                onChange={(e) => setConfirmed((c) => c ? { ...c, category: e.target.value } : c)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v as string}</option>
                ))}
              </select>
            </ConfirmRow>

            {/* Payment method */}
            <ConfirmRow
              label="Forma de pago"
              detected={detected.paymentMethod}
              detectedDisplay={detected.paymentMethod ? (PAYMENT_METHODS[rawParsed.paymentMethod as PaymentMethod] as string ?? rawParsed.paymentMethod) : undefined}
            >
              <select
                value={confirmed.paymentMethod}
                onChange={(e) => setConfirmed((c) => c ? { ...c, paymentMethod: e.target.value } : c)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>{v as string}</option>
                ))}
              </select>
            </ConfirmRow>

            {/* Paid by */}
            <ConfirmRow
              label="Quién pagó"
              detected={detected.paidBy}
              detectedDisplay={detected.paidBy ? rawParsed.paidBy : undefined}
            >
              <div className="flex gap-1.5 flex-wrap">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setConfirmed((c) => c ? { ...c, paidBy: m.name } : c)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      confirmed.paidBy === m.name
                        ? 'text-white border-transparent'
                        : 'border-gray-200 text-gray-600'
                    }`}
                    style={confirmed.paidBy === m.name ? { backgroundColor: MEMBER_COLORS[m.colorIndex] } : {}}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ backgroundColor: MEMBER_COLORS[m.colorIndex], fontSize: '8px' }}
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                    {m.name}
                  </button>
                ))}
              </div>
            </ConfirmRow>
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="w-full py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-40"
            >
              Continuar al formulario
            </button>
          </div>
        </div>
      )}

      {/* Full QuickForm after confirmation */}
      {showQuickForm && prefill && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-green-500" />
            <span className="text-green-600 text-sm font-semibold">Datos confirmados — revisa y guarda:</span>
          </div>
          <QuickForm
            currentUser={currentUser}
            onSave={handleSaveAndReset}
            prefill={prefill}
            members={members}
          />
        </div>
      )}
    </div>
  );
}

function ConfirmRow({
  label,
  detected,
  detectedDisplay,
  children,
}: {
  label: string;
  detected: boolean;
  detectedDisplay?: string;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(!detected);

  return (
    <div className={`rounded-xl p-3 border transition-all ${detected ? 'border-green-100 bg-green-50' : 'border-amber-100 bg-amber-50'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
        {detected && (
          <button onClick={() => setEditing((v) => !v)} className="text-xs text-gray-400 hover:text-gray-600">
            {editing ? 'Usar detectado' : 'Editar'}
          </button>
        )}
      </div>
      {detected && !editing ? (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800">{detectedDisplay}</span>
        </div>
      ) : (
        children
      )}
      {!detected && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-amber-400 text-white flex items-center justify-center font-bold flex-shrink-0" style={{ fontSize: '9px' }}>!</span>
          No detectado — por favor completa este campo
        </p>
      )}
    </div>
  );
}
