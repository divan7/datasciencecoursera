import { useState } from 'react';
import { Sparkles, Send, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, User } from '../types/expense';
import { parseMultipleExpensesFromText } from '../services/claudeService';
import type { SpaceMember, AppSpace } from '../types/space';
import { MultiExpenseReview, type ExpenseWithSpace } from './MultiExpenseReview';
import type { FiscalProfile } from '../types/fiscal';

interface TextParserProps {
  currentUser: User;
  currentSpaceId: string;
  spaces: AppSpace[];
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSaveMultiple: (items: ExpenseWithSpace[]) => void;
  apiKey?: string;
  members: SpaceMember[];
  fiscalProfile?: FiscalProfile;
  isOwner?: boolean;
}

const EXAMPLES = [
  'Pagué 350 pesos en Walmart con débito BBVA',
  'Netflix 219 y Spotify 89 con crédito Banamex',
  'Gasolina 800 efectivo, comida 420 con tarjeta 1234',
  'Recibí salario de 18000 por transferencia BBVA',
];

export function TextParser({ currentUser, currentSpaceId, spaces, onSave, onSaveMultiple, apiKey, fiscalProfile, isOwner }: TextParserProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedItems, setParsedItems] = useState<Partial<Expense>[] | null>(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    if (!apiKey) {
      setError(
        isOwner
          ? 'Configura tu API Key de Anthropic en Ajustes para usar esta función.'
          : 'El asistente IA aún no está activado en este espacio. El administrador debe configurarlo en Ajustes.'
      );
      return;
    }
    setLoading(true);
    setError('');
    setParsedItems(null);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const items = await parseMultipleExpensesFromText(text, apiKey, today);
      setParsedItems(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('authentication') || msg.includes('invalid x-api-key')) {
        setError('API Key inválida. Verifica que la copiaste correctamente en Ajustes.');
      } else if (msg.includes('credit') || msg.includes('billing') || msg.includes('402')) {
        setError('Sin créditos en tu cuenta Anthropic. Agrega créditos en console.anthropic.com.');
      } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        setError('Error de red. Verifica tu conexión a internet.');
      } else {
        setError(`Error al analizar: ${msg}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleParse(); }
  };

  const handleSaveAll = (items: ExpenseWithSpace[]) => {
    if (items.length === 1 && items[0].spaceId === currentSpaceId) {
      onSave(items[0].expense);
    } else {
      onSaveMultiple(items);
    }
    setParsedItems(null);
    setText('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-50 to-teal-50 rounded-2xl p-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-purple-500" />
          <p className="text-sm font-semibold text-purple-700">IA analiza tu texto</p>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Escribe uno o varios gastos o ingresos en lenguaje natural. La IA los clasifica automáticamente — si no dices que es ingreso, lo registra como gasto.
        </p>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Netflix 219, gasolina 800 efectivo, súper 1200 con débito..."
            rows={3}
            className="w-full px-3 py-2 pr-12 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none bg-white"
          />
          <button
            onClick={handleParse}
            disabled={loading || !text.trim()}
            className="absolute right-2 bottom-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-all active:scale-95"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={16} />}
          </button>
        </div>

        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-2">Ejemplos:</p>
          <div className="flex flex-wrap gap-1">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                className="px-2 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-600 hover:bg-purple-50 transition-all"
              >
                {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
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

      {parsedItems && (
        <MultiExpenseReview
          items={parsedItems}
          spaces={spaces}
          defaultSpaceId={currentSpaceId}
          currentUser={currentUser}
          onSaveAll={handleSaveAll}
          onCancel={() => setParsedItems(null)}
          fiscalProfile={fiscalProfile}
          apiKey={apiKey}
        />
      )}
    </div>
  );
}
