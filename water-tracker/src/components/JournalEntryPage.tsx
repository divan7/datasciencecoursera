import { useState } from 'react';
import { BookOpen, ChevronRight, SkipForward } from 'lucide-react';

interface Props {
  type: 'expectation' | 'weekly_reflection';
  weekNumber: number;
  onSave: (content: string) => void;
  onSkip: () => void;
}

const CONFIG = {
  expectation: {
    emoji: '🌱',
    title: '¿Qué esperas de este reto?',
    subtitle: 'Antes de empezar, escribe tus expectativas. Podrás releerlas al terminar tu plan y ver cuánto has avanzado.',
    placeholder: 'Ej: Espero tener más energía al despertar, mejorar mi digestión, notar cambios en mi piel en las primeras semanas...',
    hints: [],
    saveLabel: 'Guardar expectativa',
  },
  weekly_reflection: {
    emoji: '📝',
    title: (week: number) => `Reflexión — Semana ${week}`,
    subtitle: '¿Cómo fue tu semana de hidratación? Tu registro te ayuda a mantenerte motivado.',
    placeholder: 'Escribe libremente sobre tu experiencia...',
    hints: [
      '¿Notaste algún cambio físico? (energía, digestión, piel, sueño...)',
      '¿Qué fue lo más difícil de cumplir el plan?',
      '¿Qué logros o retrocesos tuviste?',
    ],
    saveLabel: 'Guardar reflexión',
  },
};

export function JournalEntryPage({ type, weekNumber, onSave, onSkip }: Props) {
  const [text, setText] = useState('');
  const cfg = CONFIG[type];
  const title = type === 'expectation'
    ? cfg.title as string
    : (cfg.title as (w: number) => string)(weekNumber);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex items-start justify-center p-4">
      <div className="w-full max-w-sm py-6 space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500/20 rounded-2xl border border-sky-400/30 mb-3 shadow-lg shadow-sky-500/20">
            <BookOpen size={26} className="text-sky-400" />
          </div>
          <div className="text-3xl mb-2">{cfg.emoji}</div>
          <h1 className="text-2xl font-black text-white">{title}</h1>
          <p className="text-white/50 text-sm mt-2 leading-relaxed px-2">{cfg.subtitle}</p>
        </div>

        {/* Hints */}
        {cfg.hints.length > 0 && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/8 space-y-1.5">
            {cfg.hints.map((h) => (
              <p key={h} className="text-white/45 text-xs flex items-start gap-2">
                <span className="text-sky-400 mt-0.5 flex-shrink-0">›</span>
                {h}
              </p>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={cfg.placeholder}
          rows={6}
          className="w-full bg-white/8 border border-white/15 focus:border-sky-400 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none transition-colors resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between text-xs text-white/20">
          <span>{text.length} caracteres</span>
          {text.length < 20 && text.length > 0 && (
            <span className="text-amber-400/60">Escribe un poco más...</span>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={() => { if (text.trim().length >= 10) onSave(text); }}
          disabled={text.trim().length < 10}
          className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg shadow-sky-500/30"
        >
          {cfg.saveLabel}
          <ChevronRight size={18} />
        </button>

        <button
          onClick={onSkip}
          className="w-full flex items-center justify-center gap-1.5 text-white/30 hover:text-white/55 text-sm transition-colors py-2"
        >
          <SkipForward size={14} />
          Omitir por ahora
        </button>

      </div>
    </div>
  );
}
