import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Props {
  glassSizeMl: number;
  onAdd: (ml: number) => void;
}

export function QuickAdd({ glassSizeMl, onAdd }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState('');

  const presets = [
    { label: `${glassSizeMl} ml`, value: glassSizeMl, emoji: '🥛' },
    { label: '500 ml',  value: 500,  emoji: '🍶' },
    { label: '1,000 ml', value: 1000, emoji: '🫙' },
  ].filter((p, i, arr) => arr.findIndex((x) => x.value === p.value) === i);

  function submitCustom() {
    const ml = parseInt(custom, 10);
    if (ml >= 50 && ml <= 5000) {
      onAdd(ml);
      setCustom('');
      setShowCustom(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">
        Agregar agua
      </h3>

      <div className="grid grid-cols-3 gap-3">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => onAdd(p.value)}
            className="flex flex-col items-center gap-1.5 bg-white/8 hover:bg-sky-500/25 active:scale-95 transition-all rounded-2xl p-4 border border-white/15 hover:border-sky-400/50 text-white group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{p.emoji}</span>
            <span className="text-sm font-semibold">{p.label}</span>
          </button>
        ))}
      </div>

      {showCustom ? (
        <div className="flex gap-2">
          <input
            type="number"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
            placeholder="ml (ej. 350)"
            min={50}
            max={5000}
            autoFocus
            className="flex-1 bg-white/10 border border-white/20 focus:border-sky-400 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none transition-colors"
          />
          <button
            onClick={submitCustom}
            className="bg-sky-500 hover:bg-sky-400 text-white px-4 rounded-xl font-bold transition-colors"
          >
            +
          </button>
          <button
            onClick={() => { setShowCustom(false); setCustom(''); }}
            className="p-2.5 text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-xl py-2.5 transition-colors"
        >
          <Plus size={15} />
          Cantidad personalizada
        </button>
      )}
    </div>
  );
}
