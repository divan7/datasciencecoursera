import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  clearCacheAndReload() {
    const p = Promise.resolve()
      .then(() =>
        'serviceWorker' in navigator
          ? navigator.serviceWorker.getRegistrations().then((regs) =>
              Promise.all(regs.map((r) => r.unregister()))
            )
          : undefined
      )
      .then(() =>
        'caches' in window
          ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          : undefined
      );
    p.finally(() => window.location.reload());
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gray-50">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-7 space-y-4 text-center">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-base font-bold text-gray-800">Algo salió mal</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              {this.state.error.message || 'Error inesperado. Intenta recargar la app.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-2xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-all"
            >
              Recargar app
            </button>
            <button
              onClick={() => this.clearCacheAndReload()}
              className="w-full py-2.5 rounded-2xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-all"
            >
              Limpiar caché y recargar
            </button>
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full py-2.5 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
