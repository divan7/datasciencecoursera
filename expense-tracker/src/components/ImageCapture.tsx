import { useState, useRef } from 'react';
import { Camera, Upload, X, AlertCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, User } from '../types/expense';
import { parseReceiptItems } from '../services/claudeService';
import { compressImage, base64SizeBytes } from '../utils/imageCompression';
import type { SpaceMember, AppSpace } from '../types/space';
import { MultiExpenseReview, type ExpenseWithSpace } from './MultiExpenseReview';

import type { FiscalProfile } from '../types/fiscal';

interface ImageCaptureProps {
  currentUser: User;
  currentSpaceId: string;
  spaces: AppSpace[];
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSaveMultiple: (items: ExpenseWithSpace[]) => void;
  apiKey?: string;
  members: SpaceMember[];
  fiscalProfile?: FiscalProfile;
  isOwner?: boolean;
  hasAiAccess?: boolean;
}

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export function ImageCapture({ currentUser, currentSpaceId, spaces, onSave, onSaveMultiple, apiKey, fiscalProfile, isOwner, hasAiAccess }: ImageCaptureProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mediaType, setMediaType] = useState<MediaType>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedItems, setParsedItems] = useState<Partial<Expense>[] | null>(null);
  const [totalWarning, setTotalWarning] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'gasto' | 'ingreso'>('gasto');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Por favor selecciona una imagen válida.'); return; }
    setMediaType('image/jpeg'); // output is always JPEG after compression
    setError('');
    setParsedItems(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      setImagePreview(result); // show original as preview
      const raw = result.split(',')[1];
      // Compress before sending to Claude API: max 1600px, 82% quality → typically < 400 KB
      const compressed = await compressImage(raw, 1600, 0.82, file.type as MediaType);
      setImageBase64(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    if (hasAiAccess === false) {
      setError('Esta función requiere acceso premium. Contacta al administrador para activarla.');
      return;
    }
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
    setTotalWarning(null);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { items, detectedTotal } = await parseReceiptItems(imageBase64, mediaType, apiKey, today, transactionType);
      // Attach thumbnail (further compressed) to first item for storage
      if (items.length > 0) {
        const thumbnail = await compressImage(imageBase64, 900, 0.70);
        items[0].receiptImageBase64 = thumbnail;
      }

      // Validate sum of items vs ticket total
      if (detectedTotal !== null && items.length > 0) {
        const sum = items.reduce((s, it) => s + (it.amount ?? 0), 0);
        const diff = detectedTotal - sum;
        const absDiff = Math.abs(diff);
        if (absDiff > 0.01 && absDiff < 1) {
          // Tiny rounding error — silently adjust last item
          const last = items[items.length - 1];
          if (last.amount !== undefined) {
            last.amount = Math.round((last.amount + diff) * 100) / 100;
          }
        } else if (absDiff >= 1) {
          const sign = diff > 0 ? '+' : '';
          setTotalWarning(
            `Total del ticket: $${detectedTotal.toFixed(2)} · Suma de artículos: $${sum.toFixed(2)} · Diferencia: $${sign}${diff.toFixed(2)}. Revisa y ajusta los montos antes de guardar.`
          );
        }
      }

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

  const handleClear = () => {
    setImagePreview(null); setImageBase64(''); setParsedItems(null); setError(''); setTotalWarning(null);
    setTransactionType('gasto');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSaveAll = (items: ExpenseWithSpace[]) => {
    if (items.length === 1 && items[0].spaceId === currentSpaceId) {
      onSave(items[0].expense);
    } else {
      onSaveMultiple(items);
    }
    handleClear();
  };

  return (
    <div className="space-y-4">
      <input ref={fileInputRef}   type="file" accept="image/*"              onChange={handleFileSelect} id="file-upload"     className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} id="camera-capture" className="hidden" />

      {!imagePreview ? (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={18} className="text-orange-500" />
              <p className="text-sm font-semibold text-orange-700">Captura tu ticket</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              La IA desglosa automáticamente los artículos del ticket en gastos separados. Puedes asignar cada uno a una lista diferente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="camera-capture"
                className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition-all text-orange-600 bg-white">
                <Camera size={28} />
                <span className="text-xs font-semibold">Tomar foto</span>
              </label>
              <label htmlFor="file-upload"
                className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-teal-300 rounded-xl cursor-pointer hover:bg-teal-50 transition-all text-teal-700 bg-white">
                <Upload size={28} />
                <span className="text-xs font-semibold">Subir imagen</span>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
            <p className="font-semibold mb-1">💡 Consejos para mejor resultado:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Buena iluminación, sin sombras</li>
              <li>Ticket centrado y en foco</li>
              <li>Incluir total, fecha y establecimiento</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img src={imagePreview} alt="Ticket"
              className="w-full max-h-56 object-contain rounded-xl border border-gray-200 bg-gray-50" />
            <button onClick={handleClear}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all">
              <X size={14} />
            </button>
          </div>

          {!parsedItems && (
            <>
              {/* Gasto / Ingreso toggle */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">¿Este documento es un…?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTransactionType('gasto')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                      transactionType === 'gasto'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    💸 Gasto
                  </button>
                  <button
                    onClick={() => setTransactionType('ingreso')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                      transactionType === 'ingreso'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    💰 Ingreso
                  </button>
                </div>
              </div>

              <button onClick={handleAnalyze} disabled={loading || !imageBase64}
                className={`w-full py-3 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all ${
                  transactionType === 'ingreso' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'
                }`}>
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analizando documento...</>
                ) : !imageBase64 ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparando imagen...</>
                ) : (
                  <><Sparkles size={18} /> Analizar con IA</>
                )}
              </button>
              {imageBase64 && (
                <p className="text-center text-xs text-gray-400">
                  Imagen lista · {(base64SizeBytes(imageBase64) / 1024).toFixed(0)} KB
                </p>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {totalWarning && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">{totalWarning}</p>
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
