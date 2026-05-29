import { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onSignIn: (email: string) => Promise<{ error: Error | null }>;
}

export function AuthGate({ onSignIn }: Props) {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: err } = await onSignIn(email.trim());
    setLoading(false);
    if (err) {
      const msg = err.message ?? String(err);
      if (msg.toLowerCase().includes('redirect') || msg.toLowerCase().includes('not allowed')) {
        setError(`URL no autorizada en Supabase. Ve a Authentication → URL Configuration → Redirect URLs y agrega tu dominio. (${msg})`);
      } else if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate')) {
        setError('Demasiados intentos. Espera unos minutos antes de solicitar otro enlace.');
      } else {
        setError(`Error: ${msg}`);
      }
    } else {
      setSent(true);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{ background: 'linear-gradient(135deg, #0c6878 0%, #2b8fa0 100%)' }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="24" cy="32" r="20" fill="white" opacity="0.9" />
          <circle cx="40" cy="32" r="20" fill="#f5a884" opacity="0.85" />
          <circle cx="32" cy="20" r="20" fill="white" opacity="0.6" />
        </svg>
        <div className="text-center">
          <p className="text-white/70 text-xs tracking-widest uppercase font-medium">by SOIHogar</p>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Orden Casa</h1>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">
        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle size={48} className="mx-auto text-teal-500" />
            <h2 className="text-lg font-bold text-gray-800">¡Revisa tu correo!</h2>
            <p className="text-sm text-gray-500">
              Enviamos un enlace de acceso a <strong>{email}</strong>.
              Ábrelo desde <strong>este mismo dispositivo</strong> para entrar.
            </p>
            <p className="text-xs text-gray-400">
              Si no ves el correo, revisa la carpeta de spam.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-sm text-teal-600 underline"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Acceder</h2>
              <p className="text-sm text-gray-500">
                Ingresa tu correo y te enviamos un enlace seguro para entrar — sin contraseña.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Correo electrónico
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-300">
                <Mail size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600 break-words">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
              style={{ backgroundColor: '#0c6878' }}
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                : <><Send size={16} /> Enviar enlace de acceso</>}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-white/50 text-xs text-center">
        Tus datos son privados y solo accesibles por ti y tu familia.
      </p>
    </div>
  );
}
