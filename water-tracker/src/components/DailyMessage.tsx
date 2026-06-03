import { useState } from 'react';
import { X } from 'lucide-react';
import { getDailyMessage } from '../data/messages';

const DISMISSED_KEY = () => {
  const d = new Date();
  return `aquavital-msg-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function DailyMessage() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY()) === 'true',
  );

  if (dismissed) return null;

  const msg = getDailyMessage();

  const categoryColor: Record<string, string> = {
    benefit:     'from-sky-500/20 to-cyan-500/10 border-sky-400/25',
    consequence: 'from-amber-500/20 to-orange-500/10 border-amber-400/25',
    habit:       'from-emerald-500/20 to-teal-500/10 border-emerald-400/25',
    science:     'from-violet-500/20 to-indigo-500/10 border-violet-400/25',
    motivation:  'from-sky-500/20 to-blue-500/10 border-sky-400/25',
    quote:       'from-sky-500/20 to-sky-600/10 border-sky-400/25',
  };

  const colors = categoryColor[msg.category] ?? categoryColor.motivation;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY(), 'true');
    setDismissed(true);
  }

  return (
    <div className={`bg-gradient-to-br ${colors} backdrop-blur-sm rounded-2xl p-4 border relative`}>
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-white/30 hover:text-white/60 transition-colors p-0.5"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>

      <div className="flex gap-3 pr-6">
        <span className="text-2xl flex-shrink-0 mt-0.5">{msg.emoji}</span>
        <div>
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-1">
            Mensaje del día
          </p>
          <p className="text-white/90 text-sm leading-relaxed">{msg.text}</p>
        </div>
      </div>
    </div>
  );
}
