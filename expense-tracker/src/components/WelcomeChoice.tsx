import { PlusCircle, Users } from 'lucide-react';

interface Props {
  onCreateOwn: () => void;
  onJoin: () => void;
}

export function WelcomeChoice({ onCreateOwn, onJoin }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{ background: 'linear-gradient(135deg, #1A2D33 0%, #2C5F6E 100%)' }}>

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="24" cy="32" r="20" fill="white" opacity="0.9"/>
          <circle cx="40" cy="32" r="20" fill="#E8A97A" opacity="0.85"/>
          <circle cx="32" cy="20" r="20" fill="white" opacity="0.6"/>
        </svg>
        <div className="text-center">
          <p className="text-white/70 text-xs tracking-widest uppercase font-medium">by SOIHogar</p>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Orden Casa</h1>
        </div>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">¿Cómo quieres empezar?</h2>
          <p className="text-sm text-gray-500 mt-1">
            Puedes crear tu propia lista o unirte a una que ya existe.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onCreateOwn}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:shadow-md active:scale-95 text-left"
            style={{ borderColor: '#2C5F6E', backgroundColor: '#f0fafa' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#2C5F6E' }}>
              <PlusCircle size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800">Crear mi lista</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Soy el dueño y configuro todo desde cero.
              </p>
            </div>
          </button>

          <button
            onClick={onJoin}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 transition-all hover:shadow-md active:scale-95 text-left bg-white">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#F7F4EF' }}>
              <Users size={22} style={{ color: '#E8A97A' }} />
            </div>
            <div>
              <p className="font-bold text-gray-800">Unirme a una lista</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tengo un código de invitación de 6 caracteres.
              </p>
            </div>
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          Después puedes crear más listas o unirte a otras desde la app.
        </p>
      </div>
    </div>
  );
}
