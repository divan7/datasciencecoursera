import { useState } from 'react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  onConfirm: (pin: string) => void;
  onCancel?: () => void;
  error?: string;
  memberName: string;
  memberColor: string;
}

export function PinPad({ onConfirm, onCancel, error, memberName, memberColor }: PinPadProps) {
  const [digits, setDigits] = useState<string[]>([]);

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 4) {
      setTimeout(() => onConfirm(next.join('')), 80);
    }
  };

  const handleBack = () => {
    setDigits((prev) => prev.slice(0, -1));
  };

  const buttons = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="flex flex-col items-center gap-5 p-4">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
          style={{ backgroundColor: memberColor }}
        >
          {memberName.slice(0, 2).toUpperCase()}
        </div>
        <p className="text-sm font-semibold text-gray-700">{memberName}</p>
        <p className="text-xs text-gray-400">Ingresa tu PIN de 4 dígitos</p>
      </div>

      {/* Dots */}
      <div className="flex gap-4">
        {[0,1,2,3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < digits.length
                ? 'bg-teal-600 border-teal-600'
                : 'border-gray-300 bg-white'
            }`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
        {buttons.map((btn, i) => {
          if (btn === '') return <div key={i} />;
          if (btn === '⌫') {
            return (
              <button
                key={i}
                type="button"
                onClick={handleBack}
                className="h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center transition-all"
              >
                <Delete size={20} className="text-gray-600" />
              </button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDigit(btn)}
              className="h-14 rounded-2xl bg-white border border-gray-200 hover:bg-teal-50 hover:border-teal-300 active:scale-95 text-xl font-bold text-gray-800 shadow-sm transition-all"
            >
              {btn}
            </button>
          );
        })}
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-600 py-1"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
