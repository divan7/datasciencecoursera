import { useState } from 'react';
import { Sparkles, Send, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, User } from '../types/expense';
import { parseExpenseFromText } from '../services/claudeService';
import { QuickForm } from './QuickForm';

interface TextParserProps {
  currentUser: User;
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  apiKey?: string;
  userName1: string;
  userName2: string;
}

const EXAMPLES = [
  'Pagué 350 pesos en Walmart con débito BBVA',
  'Netflix 219 crédito Banamex 5678 mensual',
  'Gasolina 800 efectivo Pemex lunes',
  'Comida 420 en restaurante La Paloma, tarjeta terminación 1234',
];

export function TextParser({ currentUser, onSave, apiKey, userName1, userName2 }: TextParserProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<Partial<Expense> | null>(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    if (!apiKey) {
      setError('Configura tu API Key de Anthropic en ajustes para usar esta función.');
      return;
    }

    setLoading(true);
    setError('');
    setParsed(null);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await parseExpenseFromText(text, apiKey, today);
      setParsed({ ...result, paidBy: result.paidBy ?? currentUser });
    } catch (err) {
      setError('No pude interpretar el texto. Intenta con más detalle o usa el formulario.');
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

  const handleSaveAndReset = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    onSave(data);
    setParsed(null);
    setText('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 border border-purple-100">
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

      {parsed && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-600 text-sm font-semibold">✅ Datos detectados — revisa y guarda:</span>
          </div>
          <QuickForm
            currentUser={currentUser}
            onSave={handleSaveAndReset}
            prefill={parsed as Partial<Expense>}
            userName1={userName1}
            userName2={userName2}
          />
        </div>
      )}
    </div>
  );
}
