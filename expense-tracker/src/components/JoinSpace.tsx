import { useState, useEffect } from 'react';
import { Search, Users, CheckCircle, AlertCircle, ArrowLeft, UserCheck, UserPlus } from 'lucide-react';
import { MEMBER_COLORS } from '../types/space';
import { invitesDb } from '../lib/db';
import type { Profile, InvitePreview } from '../lib/db';

interface Props {
  profile: Profile | null;
  onJoined: (spaceId: string, memberId: string) => void;
  onBack: () => void;
  initialCode?: string;
}

export function JoinSpace({ profile, onJoined, onBack, initialCode }: Props) {
  const [code, setCode]               = useState(initialCode ?? '');
  const [step, setStep]               = useState<'code' | 'whoami' | 'confirm'>('code');
  const [preview, setPreview]         = useState<InvitePreview | null>(null);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [colorIndex, setColorIndex]   = useState(0);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const formattedCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);

  // Auto-verify when a code arrives pre-filled from the invite URL
  useEffect(() => {
    if (initialCode && initialCode.replace(/[^A-Z0-9]/gi, '').length === 6) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async () => {
    if (formattedCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await invitesDb.preview(formattedCode);
      if (!result) { setError('Código inválido o expirado. Pide uno nuevo al dueño de la lista.'); return; }
      setPreview(result);
      setStep('whoami');
    } catch {
      setError('Error al verificar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExisting = async (memberId: string) => {
    if (!preview) return;
    setLoading(true);
    setError('');
    try {
      const result = await invitesDb.joinAsExistingMember(formattedCode, memberId);
      onJoined(result.spaceId, result.memberId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ya tiene una cuenta')) {
        setError('Ese perfil ya tiene una cuenta vinculada. Elige otro o crea uno nuevo.');
      } else {
        setError(`Error: ${msg}`);
      }
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

  const availableMembers = preview?.members.filter((m) => !m.hasProfile) ?? [];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{ background: 'linear-gradient(135deg, #1A2D33 0%, #2C5F6E 100%)' }}>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 text-white text-center" style={{ backgroundColor: '#2C5F6E' }}>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-extrabold" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Unirme a una lista
              </h1>
              <p className="text-xs" style={{ color: '#A8D5DC' }}>Ingresa el código que te compartieron</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* ── Step 1: Enter code ── */}
          {step === 'code' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#f0fafa' }}>
                  <Users size={28} style={{ color: '#2C5F6E' }} />
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
                style={{ backgroundColor: '#2C5F6E' }}>
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verificando...</>
                  : <><Search size={16} /> Verificar código</>}
              </button>
            </div>
          )}

          {/* ── Step 2: Who are you? ── */}
          {step === 'whoami' && preview && (
            <div className="space-y-5">
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
                <CheckCircle size={28} className="mx-auto mb-2 text-teal-500" />
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">Te unirás a</p>
                <p className="text-xl font-extrabold text-gray-800">{preview.spaceName}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">¿Quién eres en esta lista?</p>
                <p className="text-xs text-gray-400 mb-3">
                  Si el dueño ya creó un perfil con tu nombre, selecciónalo para vincularte. De lo contrario crea uno nuevo.
                </p>

                {availableMembers.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {availableMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={loading}
                        onClick={() => handleLinkExisting(m.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-gray-200 hover:border-teal-400 transition-all text-left disabled:opacity-50"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: MEMBER_COLORS[m.colorIndex] }}>
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                          <p className="text-xs text-teal-600">Sin cuenta vinculada — soy yo</p>
                        </div>
                        <UserCheck size={18} className="text-teal-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-300 hover:border-teal-400 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <UserPlus size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Soy alguien nuevo</p>
                    <p className="text-xs text-gray-400">Crear un perfil nuevo en esta lista</p>
                  </div>
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button onClick={() => { setStep('code'); setError(''); setPreview(null); }}
                className="w-full py-2.5 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
                Atrás
              </button>
            </div>
          )}

          {/* ── Step 3: New member details ── */}
          {step === 'confirm' && preview && (
            <div className="space-y-5">
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
                <CheckCircle size={28} className="mx-auto mb-2 text-teal-500" />
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">Nuevo miembro en</p>
                <p className="text-xl font-extrabold text-gray-800">{preview.spaceName}</p>
              </div>

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
                <button onClick={() => { setStep('whoami'); setError(''); }}
                  className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
                  Atrás
                </button>
                <button
                  onClick={handleJoin}
                  disabled={!displayName.trim() || loading}
                  className="flex-1 py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-95"
                  style={{ backgroundColor: '#2C5F6E' }}>
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
