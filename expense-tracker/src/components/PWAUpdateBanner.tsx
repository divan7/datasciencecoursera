import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export function PWAUpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      // Poll for updates every 60 seconds when the app is open
      if (r) setInterval(() => r.update(), 60_000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
      <div className="bg-gray-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm w-full pointer-events-auto">
        <RefreshCw size={16} className="text-teal-400 flex-shrink-0" />
        <p className="text-sm flex-1">Nueva versión disponible</p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-sm font-bold text-teal-400 hover:text-teal-300 active:scale-95 transition-transform"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
