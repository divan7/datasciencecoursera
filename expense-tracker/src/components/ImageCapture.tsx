import { useState, useRef } from 'react';
import { Camera, Upload, X, AlertCircle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense, User } from '../types/expense';
import { parseExpenseFromImage } from '../services/claudeService';
import { QuickForm } from './QuickForm';

interface ImageCaptureProps {
  currentUser: User;
  onSave: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  apiKey?: string;
  userName1: string;
  userName2: string;
}

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export function ImageCapture({ currentUser, onSave, apiKey, userName1, userName2 }: ImageCaptureProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mediaType, setMediaType] = useState<MediaType>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<Partial<Expense> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida.');
      return;
    }

    const mt = file.type as MediaType;
    setMediaType(mt);
    setError('');
    setParsed(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      // Extract base64 without the data URL prefix
      const base64 = result.split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    if (!apiKey) {
      setError('Configura tu API Key de Anthropic en ajustes para usar esta función.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await parseExpenseFromImage(imageBase64, mediaType, apiKey, today);
      setParsed({
        ...result,
        paidBy: result.paidBy ?? currentUser,
        receiptImageBase64: imageBase64,
      });
    } catch (err) {
      setError('No pude leer el ticket. Intenta con mejor iluminación o ingresa el gasto manualmente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImagePreview(null);
    setImageBase64('');
    setParsed(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSaveAndReset = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    onSave(data);
    handleClear();
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        id="file-upload"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        id="camera-capture"
      />

      {!imagePreview ? (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={18} className="text-orange-500" />
              <p className="text-sm font-semibold text-orange-700">Captura tu ticket</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Toma una foto o sube una imagen de tu ticket de compra. La IA detectará automáticamente los datos del gasto.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label
                htmlFor="camera-capture"
                className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition-all text-orange-600 bg-white"
              >
                <Camera size={28} />
                <span className="text-xs font-semibold">Tomar foto</span>
              </label>

              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:bg-blue-50 transition-all text-blue-600 bg-white"
              >
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
          {/* Image preview */}
          <div className="relative">
            <img
              src={imagePreview}
              alt="Ticket"
              className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50"
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {!parsed && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3 bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-60 active:scale-95 transition-all"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analizando ticket...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analizar con IA
                </>
              )}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {parsed && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-600 text-sm font-semibold">✅ Ticket analizado — revisa y guarda:</span>
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
