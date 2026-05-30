import { useState } from 'react';
import { Lock, Check, AlertCircle } from 'lucide-react';

interface Props {
  onSetPassword: (password: string) => Promise<{ error: Error | null }>;
}

export function ChangePassword({ onSetPassword }: Props) {
  const [open, setOpen]         = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const handleSave = async () => {
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await onSetPassword(password);
    setLoading(false);
    if (err) {
      setError(`Error: ${err.message}`);
    } else {
      setDone(true);
      setPassword(''); setConfirm('');
      setTimeout(() => { setDone(false); setOpen(false); }, 2500);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800 transition-colors"
      >
        <Lock size={14} /> Establecer / cambiar contraseña
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lock size={15} className="text-teal-600" />
        <p className="text-sm font-bold text-gray-700">Establecer contraseña</p>
      </div>
      <p className="text-xs text-gray-400">
        Define una contraseña para entrar al instante sin depender del enlace por correo.
      </p>

      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="Nueva contraseña (mín. 6)" autoComplete="new-password"
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirmar contraseña" autoComplete="new-password"
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5">
          <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={loading || done}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
          style={{ backgroundColor: 'var(--soi-teal)' }}>
          {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
            : done ? <><Check size={15} /> ¡Guardada!</>
            : 'Guardar contraseña'}
        </button>
        <button onClick={() => { setOpen(false); setError(''); setPassword(''); setConfirm(''); }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </div>
  );
}
