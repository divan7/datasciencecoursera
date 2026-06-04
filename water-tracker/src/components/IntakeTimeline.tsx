import { Bell, BellOff, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { IntakeLog } from '../types';

interface Props {
  logs: IntakeLog[];
  schedule: string[];
  glassSizeMl: number;
  disabledTimes: string[];
  notifPermission: NotificationPermission;
  onRemove: (id: string) => void;
  onToggleTime: (time: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
}

export function IntakeTimeline({
  logs,
  schedule,
  glassSizeMl,
  disabledTimes,
  notifPermission,
  onRemove,
  onToggleTime,
  onEnableAll,
  onDisableAll,
}: Props) {
  const completedGlasses = Math.floor(
    logs.reduce((s, l) => s + l.amount_ml, 0) / glassSizeMl,
  );

  const allEnabled = schedule.every((t) => !disabledTimes.includes(t));
  const allDisabled = schedule.every((t) => disabledTimes.includes(t));
  const showToggles = notifPermission === 'granted';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">
          Horario de hoy
        </h3>
        {showToggles && (
          <button
            onClick={allDisabled ? onEnableAll : onDisableAll}
            className="text-white/30 hover:text-white/60 text-xs transition-colors"
          >
            {allDisabled ? 'Activar todos' : allEnabled ? 'Desactivar todos' : 'Desactivar todos'}
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        {schedule.map((time, i) => {
          const done      = i < completedGlasses;
          const isCurrent = i === completedGlasses;
          const log       = done ? logs[i] : null;
          const enabled   = !disabledTimes.includes(time);

          return (
            <div
              key={time}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all ${
                done
                  ? 'bg-sky-500/15 border-sky-400/30'
                  : isCurrent
                    ? 'bg-white/10 border-sky-400/50 ring-1 ring-sky-400/30'
                    : enabled
                      ? 'bg-white/4 border-white/8'
                      : 'bg-white/2 border-white/5 opacity-50'
              }`}
            >
              {/* Status dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  done ? 'bg-sky-400' : isCurrent ? 'bg-sky-400 animate-pulse' : 'bg-white/20'
                }`}
              />

              {/* Time */}
              <span className={`text-sm tabular-nums w-12 ${done ? 'text-sky-300' : isCurrent ? 'text-white' : enabled ? 'text-white/40' : 'text-white/25'}`}>
                {time}
              </span>

              {/* Amount */}
              <span className={`text-sm flex-1 ${done ? 'text-white font-medium' : isCurrent ? 'text-white/70' : enabled ? 'text-white/30' : 'text-white/20'}`}>
                {log ? `${log.amount_ml} ml` : `${glassSizeMl} ml`}
                {log && log.logged_at && (
                  <span className="text-white/40 text-xs ml-1">
                    · {format(new Date(log.logged_at), 'HH:mm')}
                  </span>
                )}
              </span>

              {/* Actions */}
              {done && log && i === completedGlasses - 1 ? (
                <button
                  onClick={() => onRemove(log.id)}
                  className="p-1 text-white/25 hover:text-red-400 transition-colors"
                  title="Deshacer"
                >
                  <Trash2 size={13} />
                </button>
              ) : done ? (
                <span className="text-sky-400 text-xs">✓</span>
              ) : isCurrent ? (
                <span className="text-sky-300 text-xs font-semibold">← ahora</span>
              ) : showToggles ? (
                <button
                  onClick={() => onToggleTime(time)}
                  className={`p-1 transition-colors ${enabled ? 'text-white/30 hover:text-sky-400' : 'text-white/15 hover:text-white/40'}`}
                  title={enabled ? 'Desactivar notificación' : 'Activar notificación'}
                >
                  {enabled ? <Bell size={13} /> : <BellOff size={13} />}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {showToggles && schedule.some((t) => disabledTimes.includes(t)) && (
        <p className="text-white/25 text-xs text-center">
          Las notificaciones desactivadas se recuerdan para toda la semana
        </p>
      )}
    </div>
  );
}
