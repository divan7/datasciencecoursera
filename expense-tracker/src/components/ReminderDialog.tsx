import { useState } from 'react';
import { Bell, Calendar, BellOff, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { FixedExpenseTemplate } from '../types/fixedExpense';
import {
  requestNotificationPermission,
  buildGoogleCalendarUrl,
  downloadICS,
  getEffectiveDueDate,
} from '../services/notificationService';

interface Props {
  template: FixedExpenseTemplate;
  onUpdate: (id: string, data: Partial<FixedExpenseTemplate>) => void;
  onClose: () => void;
}

type ReminderType = 'push' | 'google' | 'ics' | 'both';
type Step = 'choose' | 'days' | 'done';

export function ReminderDialog({ template, onUpdate, onClose }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [chosenType, setChosenType] = useState<ReminderType | null>(null);
  const [daysBefore, setDaysBefore] = useState(1);

  const dueDate = getEffectiveDueDate(template);

  const selectType = (type: ReminderType) => {
    setChosenType(type);
    setStep('days');
  };

  const handleConfirm = async () => {
    if (!chosenType) return;

    if (chosenType === 'push' || chosenType === 'both') {
      const granted = await requestNotificationPermission();
      onUpdate(template.id, { reminderEnabled: granted, reminderDaysBefore: daysBefore });
    }

    if (chosenType === 'google' || chosenType === 'both') {
      const url = buildGoogleCalendarUrl(template);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }

    if (chosenType === 'ics') {
      downloadICS(template, daysBefore);
    }

    setStep('done');
    setTimeout(onClose, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>

        {/* Step 1: choose type */}
        {step === 'choose' && (
          <>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🔔</div>
              <h3 className="text-base font-bold text-gray-800">¿Recordatorio de pago?</h3>
              <p className="text-xs text-gray-500 mt-1">
                <strong>{template.concept}</strong>
                {dueDate && ` · próximo ${format(dueDate, "d 'de' MMMM", { locale: es })}`}
              </p>
            </div>

            <div className="space-y-2">
              {/* Google Calendar */}
              <button
                onClick={() => selectType('google')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 active:scale-98 transition-all text-left"
              >
                <Calendar size={18} className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Google Calendar</p>
                  <p className="text-xs text-blue-600">Abre Google Calendar con el evento listo para guardar</p>
                </div>
              </button>

              {/* ICS — Apple Calendar, Outlook, etc. */}
              <button
                onClick={() => selectType('ics')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-gray-100 active:scale-98 transition-all text-left"
              >
                <span className="text-lg flex-shrink-0">🗓️</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Apple Calendar / Outlook</p>
                  <p className="text-xs text-gray-500">Descarga un archivo .ics compatible con cualquier app de calendario</p>
                </div>
              </button>

              {/* In-app push */}
              <button
                onClick={() => selectType('push')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-teal-50 border border-teal-200 rounded-2xl hover:bg-teal-100 active:scale-98 transition-all text-left"
              >
                <Bell size={18} className="text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-teal-800">Notificación en la app</p>
                  <p className="text-xs text-teal-600">Aviso cuando abras Orden Casa (requiere permiso)</p>
                </div>
              </button>

              {/* Both calendar options */}
              <button
                onClick={() => selectType('both')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-2xl hover:bg-purple-100 active:scale-98 transition-all text-left"
              >
                <span className="text-lg flex-shrink-0">✨</span>
                <div>
                  <p className="text-sm font-semibold text-purple-800">Google Calendar + notificación en app</p>
                  <p className="text-xs text-purple-600">Las dos opciones al mismo tiempo</p>
                </div>
              </button>

              <button
                onClick={onClose}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-left"
              >
                <BellOff size={18} className="text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-500">No, gracias</p>
              </button>
            </div>
          </>
        )}

        {/* Step 2: days before */}
        {step === 'days' && (
          <>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">⏰</div>
              <h3 className="text-base font-bold text-gray-800">¿Con cuánta anticipación?</h3>
              <p className="text-xs text-gray-500 mt-1">Días antes del vencimiento para avisarte</p>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-3">
              {[1, 2, 3, 5, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysBefore(d)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    daysBefore === d
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-gray-400 mb-5">
              {daysBefore} día{daysBefore > 1 ? 's' : ''} antes del vencimiento
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-all"
              >
                Confirmar
              </button>
              <button
                onClick={() => setStep('choose')}
                className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
              >
                Atrás
              </button>
            </div>
          </>
        )}

        {/* Step 3: done */}
        {step === 'done' && (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-sm font-bold text-gray-800">¡Recordatorio configurado!</p>
            <p className="text-xs text-gray-500 mt-1">
              {chosenType === 'google' && 'Revisa Google Calendar para confirmar el evento recurrente.'}
              {chosenType === 'ics' && 'Abre el archivo .ics descargado para importarlo a tu calendario.'}
              {chosenType === 'push' && 'Recibirás un aviso cuando abras la app.'}
              {chosenType === 'both' && 'Revisa Google Calendar para confirmar el evento.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
