import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Sparkles, RotateCcw, AlertCircle, Square } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, User } from '../types/expense';
import { parseMultipleExpensesFromText } from '../services/claudeService';
import type { AppSpace } from '../types/space';
import { MultiExpenseReview, type ExpenseWithSpace } from './MultiExpenseReview';
import type { FiscalProfile } from '../types/fiscal';

interface VoiceRecorderProps {
  currentUser: User;
  currentSpaceId: string;
  spaces: AppSpace[];
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSaveMultiple: (items: ExpenseWithSpace[]) => void;
  apiKey?: string;
  fiscalProfile?: FiscalProfile;
  isAdmin?: boolean;
  hasAiAccess?: boolean;
  autoStart?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'done';

// webkitSpeechRecognition is not in the standard DOM lib
type SpeechRecognitionCtor = typeof SpeechRecognition;
type WSpeech = typeof window & { webkitSpeechRecognition?: SpeechRecognitionCtor };

function getSpeechRecognitionClass(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? (window as WSpeech).webkitSpeechRecognition ?? null;
}

export function VoiceRecorder({
  currentUser, currentSpaceId, spaces, onSave, onSaveMultiple,
  apiKey, fiscalProfile, isAdmin, hasAiAccess, autoStart,
}: VoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedItems, setParsedItems] = useState<Partial<Expense>[] | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingStateRef = useRef<RecordingState>('idle');
  recordingStateRef.current = recordingState;

  const SpeechRecognitionClass = getSpeechRecognitionClass();
  const supported = !!SpeechRecognitionClass;

  const stopRecording = useCallback(() => {
    setRecordingState('done');
    setInterim('');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!SpeechRecognitionClass) return;
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false; // false = iOS Safari compatible
    recognition.interimResults = true;
    recognition.lang = 'es-MX';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript + ' ';
        else interimText += r[0].transcript;
      }
      if (finalText) setTranscript((prev) => (prev ? prev.trimEnd() + ' ' + finalText.trim() : finalText.trim()));
      setInterim(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(`Error de micrófono: ${event.error}`);
      setRecordingState('done');
    };

    recognition.onend = () => {
      setInterim('');
      // Auto-restart: iOS stops recognition after ~7s of silence
      if (recordingStateRef.current === 'recording') {
        try { recognition.start(); } catch { setRecordingState('done'); }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setRecordingState('recording');
      setError('');
    } catch {
      setError('No se pudo iniciar el micrófono. Verifica los permisos.');
    }
  }, [SpeechRecognitionClass]);

  useEffect(() => {
    if (autoStart && supported) startRecording();
    return () => { try { recognitionRef.current?.abort(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = () => {
    if (recordingState === 'recording') stopRecording();
    else startRecording();
  };

  const handleReset = () => {
    stopRecording();
    setTranscript('');
    setInterim('');
    setParsedItems(null);
    setError('');
    setRecordingState('idle');
  };

  const handleAnalyze = async () => {
    const fullText = [transcript, interim].filter(Boolean).join(' ').trim();
    if (!fullText) return;
    if (hasAiAccess === false) {
      setError('Esta función requiere acceso premium. Contacta al administrador para activarla.');
      return;
    }
    if (!apiKey) {
      setError(
        isAdmin
          ? 'Configura tu API Key de Anthropic en Ajustes para usar esta función.'
          : 'El asistente IA aún no está activado. El administrador debe configurar la API Key en Ajustes.',
      );
      return;
    }
    if (recordingState === 'recording') stopRecording();
    setLoading(true);
    setError('');
    setParsedItems(null);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const items = await parseMultipleExpensesFromText(fullText, apiKey, today);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = (items: ExpenseWithSpace[]) => {
    if (items.length === 1 && items[0].spaceId === currentSpaceId) {
      onSave(items[0].expense);
    } else {
      onSaveMultiple(items);
    }
    setParsedItems(null);
    setTranscript('');
    setInterim('');
    setRecordingState('idle');
  };

  const hasText = !!(transcript || interim);

  if (!supported) {
    return (
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Micrófono no disponible</p>
          <p className="text-xs text-amber-700 mt-1">Tu navegador no soporta reconocimiento de voz. Usa Chrome, Safari o Edge actualizados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <div className="rounded-2xl p-4 border" style={{ background: 'linear-gradient(135deg, #1A2D33 0%, #2C5F6E 100%)', borderColor: '#2C5F6E' }}>
        <div className="flex items-center gap-2 mb-1">
          <Mic size={18} style={{ color: '#A8D5DC' }} />
          <p className="text-sm font-semibold text-white">Nota de voz</p>
        </div>
        <p className="text-xs mb-4" style={{ color: '#A8D5DC' }}>
          Habla de tus gastos e ingresos en español. La IA los detecta y clasifica automáticamente.
        </p>

        {/* ── Mic button ── */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleToggle}
            className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={
              recordingState === 'recording'
                ? { backgroundColor: '#C47B48', boxShadow: '0 0 0 8px rgba(232,169,122,0.3)' }
                : { backgroundColor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }
            }
          >
            {recordingState === 'recording' && (
              <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: 'rgba(232,169,122,0.25)' }} />
            )}
            {recordingState === 'recording'
              ? <Square size={28} fill="white" color="white" />
              : <Mic size={28} color="white" />}
          </button>

          <p className="text-xs text-center font-medium" style={{ color: '#A8D5DC' }}>
            {recordingState === 'recording'
              ? 'Grabando… toca para detener'
              : recordingState === 'done'
                ? 'Grabación detenida'
                : 'Toca el micrófono para grabar'}
          </p>
        </div>
      </div>

      {/* ── Live transcript ── */}
      {(hasText || recordingState !== 'idle') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transcripción</p>
            {hasText && (
              <button onClick={handleReset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                <RotateCcw size={12} /> Borrar
              </button>
            )}
          </div>

          <div className="min-h-[60px] text-sm text-gray-800 leading-relaxed">
            {transcript && <span>{transcript}</span>}
            {interim && <span className="text-gray-400 italic"> {interim}</span>}
            {!hasText && (
              <span className="text-gray-300 italic">El texto aparecerá aquí mientras hablas…</span>
            )}
          </div>

          {hasText && !parsedItems && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: '#2C5F6E' }}
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analizando…</>
                : <><Sparkles size={16} /> Analizar con IA</>}
            </button>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* ── Review ── */}
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
