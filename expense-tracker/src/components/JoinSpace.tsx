import { useState } from 'react';
import { Search, Users, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { MEMBER_COLORS } from '../types/space';
import { invitesDb } from '../lib/db';
import type { Profile } from '../lib/db';

interface Props {
  profile: Profile | null;
  onJoined: (spaceId: string, memberId: string) => void;
  onBack: () => void;
}

export function JoinSpace({ profile, onJoined, onBack }: Props) {
  const [code, setCode]             = useState('');
  const [step, setStep]             = useState<'code' | 'confirm'>('code');
  const [preview, setPreview]       = useState<{ spaceId: string; spaceName: string } | null>(null);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [colorIndex, setColorIndex] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const formattedCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);

  const handleVerify = async () => {
    if (formattedCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await invitesDb.preview(formattedCode);
      if (!result) { setError('Código inválido o expirado. Pide uno nuevo al dueño de la lista.'); return; }
      setPreview(result);
      setStep('confirm');
    } catch {
      setError('Error al verificar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!preview || !displayName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await invitesDb.join(formattedCode, displayName.trim(), colorIndex);
      onJoined(result.spaceId, result.memberId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('Ya eres miembro') ? 'Ya eres miembro de esta lista.' : `Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{ background: 'linear-gradient(135deg, #0c6878 0%, #2b8fa0 100%)' }}>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 text-white text-center" style={{ backgroundColor: '#0c6878' }}>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-extrabold" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Unirme a una lista
              </h1>
              <p className="text-xs" style={{ color: '#7dd4e0' }}>Ingresa el código que te compartieron</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 'code' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#f0fafa' }}>
                  <Users size={28} style={{ color: '#0c6878' }} />
                </div>
                <p className="text-sm text-gray-500">
                  El dueño de la lista te compartió un código de 6 caracteres.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Código de invitación
                </label>
                <input
                  type="text"
                  value={formattedCode}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="AB3X7K"
                  maxLength={6}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl text-center text-2xl font-bold tracking-widest uppercase focus:outline-none focus:border-teal-400 transition-colors"
                  style={{ fontFamily: 'monospace', letterSpacing: '0.3em' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={formattedCode.length !== 6 || loading}
                className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-95"
                style={{ backgroundColor: '#0c6878' }}>
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verificando...</>
                  : <><Search size={16} /> Verificar código</>}
              </button>
            </div>
          )}

          {step === 'confirm' && preview && (
            <div className="space-y-5">
              {/* Space preview */}
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
                <CheckCircle size={28} className="mx-auto mb-2 text-teal-500" />
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">Te unirás a</p>
                <p className="text-xl font-extrabold text-gray-800">{preview.spaceName}</p>
              </div>

              {/* Display name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Tu nombre en esta lista
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 font-medium"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Tu color
                </label>
                <div className="flex flex-wrap gap-2">
                  {MEMBER_COLORS.map((color, i) => (
                    <button key={i} type="button" onClick={() => setColorIndex(i)}
                      className={`w-9 h-9 rounded-full transition-all ${colorIndex === i ? 'ring-2 ring-offset-2 ring-teal-500 scale-110' : ''}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
                {displayName && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: MEMBER_COLORS[colorIndex] }}>
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-600 font-medium">{displayName}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setStep('code'); setError(''); setPreview(null); }}
                  className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
                  Atrás
                </button>
                <button
                  onClick={handleJoin}
                  disabled={!displayName.trim() || loading}
                  className="flex-1 py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-95"
                  style={{ backgroundColor: '#0c6878' }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uniéndome...</>
                    : <><CheckCircle size={16} /> Confirmar y unirme</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
