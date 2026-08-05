import { useState } from 'react';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onSignIn: (email: string) => Promise<{ error: Error | null }>;
  onSignInPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  onSignUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
}

type Mode = 'login' | 'signup' | 'magic';

export function AuthGate({ onSignIn, onSignInPassword, onSignUp }: Props) {
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setName]  = useState('');
  const [sent, setSent]         = useState(false);
  const [confirmMsg, setConfirmMsg] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const translateError = (raw: string): string => {
    const m = raw.toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Correo o contraseña incorrectos.';
    if (m.includes('email not confirmed')) return 'Aún no confirmas tu correo. Revisa tu bandeja (y spam) y abre el enlace de confirmación.';
    if (m.includes('user already registered') || m.includes('already been registered')) return 'Ese correo ya está registrado. Inicia sesión con tu contraseña o usa el enlace por correo.';
    if (m.includes('password should be') || m.includes('at least 6')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (m.includes('rate limit') || m.includes('email rate')) return 'Demasiados intentos. Espera unos minutos antes de volver a intentar.';
    if (m.includes('redirect') || m.includes('not allowed')) return `URL no autorizada en Supabase. Agrega tu dominio en Authentication → URL Configuration → Redirect URLs. (${raw})`;
    return `Error: ${raw}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    if (mode === 'magic') {
      const { error: err } = await onSignIn(email.trim());
      setLoading(false);
      if (err) setError(translateError(err.message ?? String(err)));
      else setSent(true);
      return;
    }

    if (mode === 'login') {
      const { error: err } = await onSignInPassword(email.trim(), password);
      setLoading(false);
      if (err) setError(translateError(err.message ?? String(err)));
      // success → auth state change drives the app forward
      return;
    }

    // signup
    if (password.length < 6) { setLoading(false); setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    const { error: err, needsConfirmation } = await onSignUp(email.trim(), password, displayName.trim() || undefined);
    setLoading(false);
    if (err) setError(translateError(err.message ?? String(err)));
    else if (needsConfirmation) setConfirmMsg(true);
    // if no confirmation needed, session is created and the app moves on
  };

  const switchMode = (m: Mode) => { setMode(m); setError(''); setPassword(''); };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{ background: 'linear-gradient(135deg, #1A2D33 0%, #2C5F6E 100%)' }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="24" cy="32" r="20" fill="white" opacity="0.9" />
          <circle cx="40" cy="32" r="20" fill="#E8A97A" opacity="0.85" />
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
            <p className="text-xs text-gray-400">Si no ves el correo, revisa la carpeta de spam.</p>
            <button onClick={() => { setSent(false); setMode('login'); }} className="text-sm text-teal-600 underline">
              Volver al inicio de sesión
            </button>
          </div>
        ) : confirmMsg ? (
          <div className="text-center space-y-4">
            <Mail size={48} className="mx-auto text-teal-500" />
            <h2 className="text-lg font-bold text-gray-800">Confirma tu correo</h2>
            <p className="text-sm text-gray-500">
              Enviamos un correo de confirmación a <strong>{email}</strong>.
              Ábrelo para activar tu cuenta y luego inicia sesión con tu contraseña.
            </p>
            <button onClick={() => { setConfirmMsg(false); setMode('login'); }} className="text-sm text-teal-600 underline">
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Acceso por enlace'}
              </h2>
              <p className="text-sm text-gray-500">
                {mode === 'login' && 'Entra con tu correo y contraseña.'}
                {mode === 'signup' && 'Regístrate una vez y luego entra al instante con tu contraseña.'}
                {mode === 'magic' && 'Te enviamos un enlace seguro por correo — útil si olvidaste tu contraseña.'}
              </p>
            </div>

            {/* Name — only on signup */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Tu nombre</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-300">
                  <UserIcon size={16} className="text-gray-400 flex-shrink-0" />
                  <input type="text" value={displayName} onChange={(e) => setName(e.target.value)}
                    placeholder="¿Cómo te llamas?"
                    className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400" />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Correo electrónico</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-300">
                <Mail size={16} className="text-gray-400 flex-shrink-0" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com" required autoComplete="email"
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400" />
              </div>
            </div>

            {/* Password — not on magic mode */}
            {mode !== 'magic' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Contraseña</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-300">
                  <Lock size={16} className="text-gray-400 flex-shrink-0" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : 'Tu contraseña'} required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600 break-words">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading || !email.trim()}
              className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
              style={{ backgroundColor: '#2C5F6E' }}>
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Procesando...</>
                : mode === 'login' ? <><LogIn size={16} /> Entrar</>
                : mode === 'signup' ? <><UserPlus size={16} /> Crear cuenta</>
                : <><Send size={16} /> Enviar enlace</>}
            </button>

            {/* Mode switches */}
            <div className="text-center space-y-1.5 pt-1">
              {mode === 'login' && (
                <>
                  <p className="text-xs text-gray-500">
                    ¿No tienes cuenta?{' '}
                    <button type="button" onClick={() => switchMode('signup')} className="text-teal-600 font-semibold underline">Regístrate</button>
                  </p>
                  <p className="text-xs text-gray-400">
                    <button type="button" onClick={() => switchMode('magic')} className="text-teal-600 underline">Acceder con enlace por correo</button>
                  </p>
                </>
              )}
              {mode === 'signup' && (
                <p className="text-xs text-gray-500">
                  ¿Ya tienes cuenta?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="text-teal-600 font-semibold underline">Inicia sesión</button>
                </p>
              )}
              {mode === 'magic' && (
                <p className="text-xs text-gray-500">
                  <button type="button" onClick={() => switchMode('login')} className="text-teal-600 font-semibold underline">Volver a iniciar sesión con contraseña</button>
                </p>
              )}
            </div>
          </form>
        )}
      </div>

      <p className="mt-6 text-white/50 text-xs text-center">
        Tus datos son privados y solo accesibles por ti y tu familia.
      </p>
    </div>
  );
}
