import { useState } from 'react';
import { Droplets } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin]   = useState(true);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Revisa tu correo para confirmar tu cuenta.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500/20 rounded-2xl border border-sky-400/30 mb-3 shadow-lg shadow-sky-500/20">
            <Droplets size={32} className="text-sky-400" />
          </div>
          <h1 className="text-3xl font-black text-white">AquaVital</h1>
          <p className="text-sky-300/60 text-sm mt-1">Tu compañero de hidratación</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/8 backdrop-blur-sm rounded-2xl p-6 border border-white/15 space-y-4"
        >
          <h2 className="text-white font-bold text-lg">
            {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            required
            className="w-full bg-white/10 border border-white/20 focus:border-sky-400 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none transition-colors"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            minLength={6}
            className="w-full bg-white/10 border border-white/20 focus:border-sky-400 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none transition-colors"
          />

          {error   && <p className="text-red-400 text-sm">{error}</p>}
          {message && <p className="text-emerald-400 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-sky-500/30"
          >
            {loading ? 'Cargando…' : isLogin ? 'Entrar' : 'Registrarme'}
          </button>

          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
            className="w-full text-sky-300/70 hover:text-sky-200 text-sm transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </form>

        <p className="text-center text-white/25 text-xs mt-5">
          Basado en la fórmula de Frank Suarez · MetabolismoTV
        </p>
      </div>
    </div>
  );
}
