import { useState } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle, RotateCcw, X } from 'lucide-react';

interface Props {
  nextTime: string | null;
  countdown: string;
  isOverdue: boolean;
  isDone: boolean;
  notifPermission: NotificationPermission;
  completedGlasses: number;
  totalGlasses: number;
  overdueGlasses: number;
  firstOverdueTime: string | null;
  glassSizeMl: number;
  onRequestPermission: () => void;
  onLogPastDrink: (amountMl: number, time: string) => void;
}

export function ReminderCard({
  nextTime,
  countdown,
  isOverdue,
  isDone,
  notifPermission,
  completedGlasses,
  totalGlasses,
  overdueGlasses,
  firstOverdueTime,
  glassSizeMl,
  onRequestPermission,
  onLogPastDrink,
}: Props) {
  const [showCatchUp, setShowCatchUp] = useState(false);
  const [catchUpTime, setCatchUpTime] = useState(firstOverdueTime ?? '');
  const [catchUpAmount, setCatchUpAmount] = useState(String(glassSizeMl));

  // Keep time in sync if firstOverdueTime changes
  const effectiveTime = catchUpTime || firstOverdueTime || '';

  function submitCatchUp() {
    const ml = parseInt(catchUpAmount, 10);
    if (ml > 0 && effectiveTime) {
      onLogPastDrink(ml, effectiveTime);
      setShowCatchUp(false);
      setCatchUpTime('');
    }
  }

  if (isDone) {
    return (
      <div className="bg-emerald-500/20 backdrop-blur-sm rounded-2xl p-4 border border-emerald-400/30 flex items-center gap-4">
        <div className="text-3xl">🎉</div>
        <div>
          <p className="text-white font-semibold">¡Meta diaria completada!</p>
          <p className="text-emerald-300 text-sm">{totalGlasses} vasos · excelente trabajo hoy</p>
        </div>
      </div>
    );
  }

  const hasDeficit = overdueGlasses > 0;

  return (
    <div className="space-y-2">
      {/* Main reminder row */}
      <div
        className={`backdrop-blur-sm rounded-2xl p-4 border ${
          hasDeficit
            ? 'bg-amber-500/15 border-amber-400/35'
            : 'bg-white/8 border-white/15'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={18} className={hasDeficit ? 'text-amber-400' : 'text-sky-400'} />
            <div>
              <p className="text-white/50 text-xs">
                {isOverdue ? 'Toma programada' : 'Próxima toma'}
              </p>
              <p className="text-white font-bold text-xl leading-tight">{nextTime ?? '--:--'}</p>
              <p className={`text-sm ${isOverdue ? 'text-amber-300' : 'text-sky-300'}`}>
                {countdown}
              </p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1.5">
            <div>
              <p className="text-white/40 text-xs">Vasos</p>
              <p className="text-white font-bold text-xl leading-tight">
                {completedGlasses}
                <span className="text-white/35 text-sm font-normal">/{totalGlasses}</span>
              </p>
            </div>
            {notifPermission === 'default' && (
              <button
                onClick={onRequestPermission}
                className="flex items-center gap-1 text-xs bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/25 rounded-lg px-2 py-1 transition-colors"
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

      {/* Deficit banner */}
      {hasDeficit && !showCatchUp && (
        <div className="bg-amber-500/10 rounded-xl px-4 py-3 border border-amber-400/25 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-amber-200 text-sm font-medium">
                {overdueGlasses === 1
                  ? '1 vaso de retraso'
                  : `${overdueGlasses} vasos de retraso`}
              </p>
              <p className="text-amber-200/60 text-xs">
                {overdueGlasses === 1
                  ? 'Toma un vaso extra pronto para ponerte al corriente.'
                  : `Distribuye ${overdueGlasses} vasos adicionales en las próximas horas.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setCatchUpTime(firstOverdueTime ?? ''); setShowCatchUp(true); }}
            className="flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 hover:text-white border border-amber-400/30 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0"
          >
            <RotateCcw size={11} />
            Registrar toma olvidada
          </button>
        </div>
      )}

      {/* Catch-up inline form */}
      {showCatchUp && (
        <div className="bg-amber-500/10 rounded-xl px-4 py-3 border border-amber-400/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-amber-200 text-sm font-medium">Registrar toma no registrada</p>
            <button onClick={() => setShowCatchUp(false)} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Hora en que tomaste</label>
              <input
                type="time"
                value={effectiveTime}
                onChange={(e) => setCatchUpTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-sm focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Cantidad (ml)</label>
              <input
                type="number"
                value={catchUpAmount}
                onChange={(e) => setCatchUpAmount(e.target.value)}
                min={50}
                max={2000}
                className="w-full bg-white/10 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>
          <button
            onClick={submitCatchUp}
            className="w-full bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 hover:text-white font-semibold py-2 rounded-xl text-sm transition-colors border border-amber-400/30"
          >
            Registrar toma
          </button>
        </div>
      )}
    </div>
  );
}
