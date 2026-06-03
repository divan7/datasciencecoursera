import { useState } from 'react';
import { Bell, Calendar, BellOff, X, Download } from 'lucide-react';
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

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream;
}

// Opens a URL without being blocked by mobile popup blockers.
// Must be called synchronously (not after an await) to avoid being treated as a popup.
function openUrl(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function ReminderDialog({ template, onUpdate, onClose }: Props) {
  const [step, setStep]         = useState<Step>('choose');
  const [chosenType, setChosenType] = useState<ReminderType | null>(null);
  const [daysBefore, setDaysBefore] = useState(1);

  const dueDate  = getEffectiveDueDate(template);
  const onIPhone = isIOS();

  const selectType = (type: ReminderType) => {
    setChosenType(type);
    setStep('days');
  };

  const handleConfirm = async () => {
    if (!chosenType) return;

    try {
      // Open Google Calendar URL *before* any await to avoid popup blockers on mobile
      if (chosenType === 'google' || chosenType === 'both') {
        const url = buildGoogleCalendarUrl(template);
        if (url) openUrl(url);
      }

      if (chosenType === 'ics') {
        downloadICS(template, daysBefore);
      }

      if (chosenType === 'push' || chosenType === 'both') {
        const granted = await requestNotificationPermission();
        onUpdate(template.id, { reminderEnabled: granted, reminderDaysBefore: daysBefore });
      }
    } catch (err) {
      console.error('Error configurando recordatorio:', err);
    }

    setStep('done');
    setTimeout(onClose, 2200);
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
              {/* ICS — recommended on iPhone */}
              <button
                onClick={() => selectType('ics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                  onIPhone
                    ? 'bg-teal-50 border-teal-300 hover:bg-teal-100'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Download size={18} className={onIPhone ? 'text-teal-600 flex-shrink-0' : 'text-gray-500 flex-shrink-0'} />
                <div>
                  <p className={`text-sm font-semibold ${onIPhone ? 'text-teal-800' : 'text-gray-800'}`}>
                    {onIPhone ? '📅 Apple Calendar (recomendado)' : '🗓️ Apple Calendar / Outlook'}
                  </p>
                  <p className={`text-xs ${onIPhone ? 'text-teal-600' : 'text-gray-500'}`}>
                    {onIPhone
                      ? 'Descarga el evento y se agrega directo a tu iPhone'
                      : 'Archivo .ics compatible con cualquier app de calendario'}
                  </p>
                </div>
              </button>

              {/* Google Calendar */}
              <button
                onClick={() => selectType('google')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-all text-left"
              >
                <Calendar size={18} className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Google Calendar</p>
                  <p className="text-xs text-blue-600">
                    Abre el formulario del evento — deberás tocar <strong>Guardar</strong> en Google Calendar
                  </p>
                </div>
              </button>

              {/* In-app push */}
              <button
                onClick={() => selectType('push')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-all text-left"
              >
                <Bell size={18} className="text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">Notificación en la app</p>
                  <p className="text-xs text-orange-600">Aviso cuando abras Orden Casa (requiere permiso)</p>
                </div>
              </button>

              {/* Google + push */}
              <button
                onClick={() => selectType('both')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-2xl hover:bg-purple-100 transition-all text-left"
              >
                <span className="text-lg flex-shrink-0">✨</span>
                <div>
                  <p className="text-sm font-semibold text-purple-800">Google Calendar + notificación en app</p>
                  <p className="text-xs text-purple-600">Las dos opciones (recuerda guardar en Google Calendar)</p>
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
            <p className="text-sm font-bold text-gray-800">¡Listo!</p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {chosenType === 'google' && (
                <>Busca la pestaña de Google Calendar que se abrió y toca <strong>Guardar</strong> para que el evento quede en tu calendario.</>
              )}
              {chosenType === 'ics' && (
                onIPhone
                  ? 'Abre el archivo descargado — iOS te preguntará si deseas agregar el evento a tu calendario.'
                  : 'Abre el archivo .ics descargado para importarlo a tu app de calendario.'
              )}
              {chosenType === 'push' && 'Recibirás un aviso cuando abras Orden Casa cerca de la fecha.'}
              {chosenType === 'both' && (
                <>Busca la pestaña de Google Calendar y toca <strong>Guardar</strong>. También recibirás notificación en la app.</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
