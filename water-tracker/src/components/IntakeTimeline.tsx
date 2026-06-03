import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { IntakeLog } from '../types';

interface Props {
  logs: IntakeLog[];
  schedule: string[];
  glassSizeMl: number;
  onRemove: (id: string) => void;
}

export function IntakeTimeline({ logs, schedule, glassSizeMl, onRemove }: Props) {
  const completedGlasses = Math.floor(
    logs.reduce((s, l) => s + l.amount_ml, 0) / glassSizeMl,
  );

  return (
    <div className="space-y-3">
      <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">
        Horario de hoy
      </h3>

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        {schedule.map((time, i) => {
          const done     = i < completedGlasses;
          const isCurrent = i === completedGlasses;
          const log      = done ? logs[i] : null;

          return (
            <div
              key={time}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all ${
                done
                  ? 'bg-sky-500/15 border-sky-400/30'
                  : isCurrent
                    ? 'bg-white/10 border-sky-400/50 ring-1 ring-sky-400/30'
                    : 'bg-white/4 border-white/8'
              }`}
            >
              {/* Status dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  done ? 'bg-sky-400' : isCurrent ? 'bg-sky-400 animate-pulse' : 'bg-white/20'
                }`}
              />

              {/* Time */}
              <span className={`text-sm tabular-nums w-12 ${done ? 'text-sky-300' : isCurrent ? 'text-white' : 'text-white/40'}`}>
                {time}
              </span>

              {/* Amount */}
              <span className={`text-sm flex-1 ${done ? 'text-white font-medium' : isCurrent ? 'text-white/70' : 'text-white/30'}`}>
                {log ? `${log.amount_ml} ml` : `${glassSizeMl} ml`}
                {log && log.logged_at && (
                  <span className="text-white/40 text-xs ml-1">
                    · {format(new Date(log.logged_at), 'HH:mm')}
                  </span>
                )}
              </span>

              {/* Label / delete */}
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
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
