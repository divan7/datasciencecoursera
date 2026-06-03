import { Bell, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Props {
  nextTime: string | null;
  countdown: string;
  isOverdue: boolean;
  isDone: boolean;
  notifPermission: NotificationPermission;
  completedGlasses: number;
  totalGlasses: number;
  onRequestPermission: () => void;
}

export function ReminderCard({
  nextTime,
  countdown,
  isOverdue,
  isDone,
  notifPermission,
  completedGlasses,
  totalGlasses,
  onRequestPermission,
}: Props) {
  if (isDone) {
    return (
      <div className="bg-emerald-500/20 backdrop-blur-sm rounded-2xl p-4 border border-emerald-400/30 flex items-center gap-4">
        <div className="text-3xl">🎉</div>
        <div>
          <p className="text-white font-semibold">¡Meta diaria completada!</p>
          <p className="text-emerald-300 text-sm">
            {totalGlasses} vasos · excelente trabajo hoy
          </p>
        </div>
      </div>
    );
  }

  const borderColor = isOverdue ? 'border-amber-400/40' : 'border-white/20';
  const bgColor     = isOverdue ? 'bg-amber-500/15' : 'bg-white/10';
  const Icon        = isOverdue ? AlertCircle : Clock;
  const iconColor   = isOverdue ? 'text-amber-400' : 'text-sky-400';

  return (
    <div className={`${bgColor} backdrop-blur-sm rounded-2xl p-4 border ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon size={20} className={iconColor} />
          <div>
            <p className="text-white/60 text-xs">
              {isOverdue ? 'Retraso en toma' : 'Próxima toma'}
            </p>
            <p className="text-white font-bold text-xl leading-tight">{nextTime ?? '--:--'}</p>
            <p className={`text-sm ${isOverdue ? 'text-amber-300' : 'text-sky-300'}`}>
              {countdown}
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <p className="text-white/50 text-xs">Vasos</p>
            <p className="text-white font-bold text-xl leading-tight">
              {completedGlasses}
              <span className="text-white/40 text-sm font-normal">/{totalGlasses}</span>
            </p>
          </div>

          {notifPermission === 'default' && (
            <button
              onClick={onRequestPermission}
              className="flex items-center gap-1 text-xs bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/30 rounded-lg px-2 py-1 transition-colors"
            >
              <Bell size={11} />
              Activar alertas
            </button>
          )}
          {notifPermission === 'granted' && (
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 size={11} />
              Alertas activas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
