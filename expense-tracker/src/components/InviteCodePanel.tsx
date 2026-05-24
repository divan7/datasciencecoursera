import { useState, useEffect } from 'react';
import { Link2, Copy, Check, Trash2, RefreshCw } from 'lucide-react';
import { invitesDb, type SpaceInvite } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { AppSpace } from '../types/space';

interface Props {
  space: AppSpace;
  currentMemberId: string;
}

function daysLeft(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000));
}

export function InviteCodePanel({ space, currentMemberId }: Props) {
  const [invites, setInvites]     = useState<SpaceInvite[]>([]);
  const [loading, setLoading]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    load();
  }, [space.id]);

  const load = async () => {
    setLoading(true);
    const list = await invitesDb.listForSpace(space.id);
    setInvites(list);
    setLoading(false);
  };

  const activeInvite: SpaceInvite | undefined = invites[0];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await invitesDb.create(space.id, space.name, currentMemberId);
      await load();
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await invitesDb.revoke(id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCopy = () => {
    if (!activeInvite) return;
    const text = `Te invito a unirte a mi lista "${space.name}" en Orden Casa.\nUsa el código: ${activeInvite.code}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = () => {
    if (!activeInvite) return;
    const text = encodeURIComponent(
      `Te invito a unirte a mi lista "${space.name}" en Orden Casa 🏠\nUsa el código: *${activeInvite.code}*`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isSupabaseConfigured) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 size={15} style={{ color: '#0c6878' }} />
        <p className="text-sm font-bold text-gray-700">Código de invitación</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeInvite ? (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-3">
          {/* Code display */}
          <div className="text-center">
            <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">Código activo</p>
            <p className="text-4xl font-black tracking-widest text-gray-800"
              style={{ fontFamily: 'monospace', letterSpacing: '0.3em' }}>
              {activeInvite.code}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Válido {daysLeft(activeInvite.expiresAt)} días más · {activeInvite.useCount}/{activeInvite.maxUses} usos
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border transition-all"
              style={{ borderColor: '#0c6878', color: copied ? '#10b981' : '#0c6878', backgroundColor: 'white' }}>
              {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
            </button>
            <button onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{ backgroundColor: '#25D366' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
          </div>

          {/* Revoke */}
          <button onClick={() => handleRevoke(activeInvite.id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
            <Trash2 size={12} /> Revocar código
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center space-y-3">
          <p className="text-sm text-gray-500">
            Genera un código para invitar personas a esta lista.
            El código es válido 7 días y acepta hasta 20 personas.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center justify-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 active:scale-95"
            style={{ backgroundColor: '#0c6878' }}>
            {generating
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
              : <><RefreshCw size={14} /> Generar código</>}
          </button>
        </div>
      )}
    </div>
  );
}
