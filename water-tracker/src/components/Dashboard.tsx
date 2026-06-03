import { Settings, LogOut, Droplets } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WaterCircle } from './WaterCircle';
import { QuickAdd } from './QuickAdd';
import { IntakeTimeline } from './IntakeTimeline';
import { ReminderCard } from './ReminderCard';
import { useIntake } from '../hooks/useIntake';
import { useReminder } from '../hooks/useReminder';
import type { UserProfile } from '../types';

const QUOTES = [
  'El agua es el primer alimento que necesita tu metabolismo.',
  'La hidratación activa tu metabolismo y aumenta tu energía.',
  'El agua oxigena cada célula de tu cuerpo.',
  '¡Casi llegas! El agua es la gasolina de tu metabolismo.',
  '¡Meta cumplida! Tu metabolismo te lo agradece.',
];

interface Props {
  profile: UserProfile;
  userId: string | null;
  onEditProfile: () => void;
  onLogout: () => void;
}

export function Dashboard({ profile, userId, onEditProfile, onLogout }: Props) {
  const { logs, totalMl, addIntake, removeIntake } = useIntake(userId);
  const reminder = useReminder(profile, totalMl);

  const pct = Math.min(100, (totalMl / profile.daily_goal_ml) * 100);
  const quoteIndex = Math.min(4, Math.floor(pct / 25));
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-6 pb-2 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Droplets size={18} className="text-sky-400" />
            <span className="text-white font-black tracking-tight text-lg">AquaVital</span>
          </div>
          <p className="text-white/30 text-xs capitalize mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEditProfile}
            className="p-2.5 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/8 transition-all"
            title="Configuración"
          >
            <Settings size={18} />
          </button>
          {userId && (
            <button
              onClick={onLogout}
              className="p-2.5 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/8 transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5" style={{ scrollbarWidth: 'none' }}>
        {/* Water progress circle */}
        <div className="pt-2">
          <WaterCircle percentage={pct} consumedMl={totalMl} goalMl={profile.daily_goal_ml} />
        </div>

        {/* Quote */}
        <p className="text-center text-white/40 text-xs px-6 italic">
          "{QUOTES[quoteIndex]}"
          <span className="not-italic text-white/20"> — Frank Suarez</span>
        </p>

        {/* Reminder */}
        <ReminderCard
          nextTime={reminder.nextTime}
          countdown={reminder.countdown}
          isOverdue={reminder.isOverdue}
          isDone={reminder.isDone}
          notifPermission={reminder.notifPermission}
          completedGlasses={reminder.completedGlasses}
          totalGlasses={reminder.totalGlasses}
          onRequestPermission={reminder.requestPermission}
        />

        {/* Quick add */}
        <QuickAdd glassSizeMl={profile.glass_size_ml} onAdd={addIntake} />

        {/* Schedule / timeline */}
        <IntakeTimeline
          logs={logs}
          schedule={reminder.schedule}
          glassSizeMl={profile.glass_size_ml}
          onRemove={removeIntake}
        />
      </div>
    </div>
  );
}
