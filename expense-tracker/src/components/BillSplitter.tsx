import { useState, useMemo } from 'react';
import { X, Users, Copy, Check } from 'lucide-react';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';
import type { ObligationEntry } from '../types/expense';

interface Item {
  concept: string;
  amount: number;
}

interface BillSplitterProps {
  items: Item[];
  members: SpaceMember[];
  onClose: () => void;
  /** Called when user clicks "Aplicar" — receives per-item obligation arrays */
  onApplySplit?: (itemObligations: ObligationEntry[][]) => void;
}

export function BillSplitter({ items, members, onClose, onApplySplit }: BillSplitterProps) {
  const [participants, setParticipants] = useState<string[]>(members.map((m) => m.name));
  const [assignments, setAssignments] = useState<Record<number, string[]>>({});
  const [tipMode, setTipMode] = useState<'pct' | 'fixed'>('pct');
  const [tipValue, setTipValue] = useState('');
  const [tipForAll, setTipForAll] = useState(true);
  const [tipParticipants, setTipParticipants] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [copied, setCopied] = useState(false);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);

  const tipAmount = useMemo(() => {
    if (!tipValue || parseFloat(tipValue) <= 0) return 0;
    return tipMode === 'pct' ? (totalItems * parseFloat(tipValue)) / 100 : parseFloat(tipValue);
  }, [tipValue, tipMode, totalItems]);

  const perPerson = useMemo(() => {
    const result: Record<string, number> = {};
    participants.forEach((p) => { result[p] = 0; });

    items.forEach((item, i) => {
      const raw = assignments[i] ?? participants;
      const actual = raw.filter((n) => participants.includes(n));
      if (actual.length === 0) return;
      const share = item.amount / actual.length;
      actual.forEach((p) => { result[p] = (result[p] ?? 0) + share; });
    });

    const tipees = tipForAll ? participants : tipParticipants.filter((p) => participants.includes(p));
    if (tipAmount > 0 && tipees.length > 0) {
      const tipShare = tipAmount / tipees.length;
      tipees.forEach((p) => { result[p] = (result[p] ?? 0) + tipShare; });
    }
    return result;
  }, [participants, items, assignments, tipAmount, tipForAll, tipParticipants]);

  const grandTotal = useMemo(() => Object.values(perPerson).reduce((s, v) => s + v, 0), [perPerson]);

  // Per-item obligations for persisting — includes proportional tip per item
  const itemObligations = useMemo<ObligationEntry[][]>(() => {
    const tipees = tipForAll ? participants : tipParticipants.filter((p) => participants.includes(p));
    return items.map((item, i) => {
      const raw = assignments[i] ?? participants;
      const actual = raw.filter((n) => participants.includes(n));
      if (actual.length === 0) return [];
      const baseShare = item.amount / actual.length;
      const itemTip =
        tipAmount > 0 && tipees.length > 0 && totalItems > 0
          ? (tipAmount * item.amount / totalItems) / tipees.length
          : 0;
      return actual.map((p) => ({
        name: p,
        amount: parseFloat((baseShare + (tipees.includes(p) ? itemTip : 0)).toFixed(2)),
      }));
    });
  }, [items, assignments, participants, tipAmount, tipForAll, tipParticipants, totalItems]);

  const memberColor = (name: string) => {
    const m = members.find((mem) => mem.name === name);
    return m ? MEMBER_COLORS[m.colorIndex] : '#6b7280';
  };

  const addParticipant = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !participants.includes(trimmed)) setParticipants((p) => [...p, trimmed]);
    setNewName('');
  };

  const removeParticipant = (name: string) => {
    setParticipants((p) => p.filter((n) => n !== name));
    const next: Record<number, string[]> = {};
    Object.entries(assignments).forEach(([k, v]) => { next[parseInt(k)] = v.filter((n) => n !== name); });
    setAssignments(next);
    setTipParticipants((p) => p.filter((n) => n !== name));
  };

  const toggleItemAssignee = (itemIdx: number, name: string) => {
    const current = assignments[itemIdx] ?? participants;
    const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
    setAssignments((a) => ({ ...a, [itemIdx]: next }));
  };

  const isAssigned = (itemIdx: number, name: string) =>
    (assignments[itemIdx] ?? participants).includes(name);

  const copySummary = () => {
    const lines = [
      '🧾 División de cuenta',
      `Total cuenta: $${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      ...(tipAmount > 0 ? [`Propina incluida: $${tipAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`] : []),
      '',
      ...participants.map((p) => `${p}: $${(perPerson[p] ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-purple-600" />
            <h2 className="text-base font-bold text-gray-900">Dividir cuenta</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-5 pb-10">
          {/* Participants */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Participantes</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {participants.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: memberColor(name) }}
                >
                  {name}
                  <button type="button" onClick={() => removeParticipant(name)} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(newName); } }}
                placeholder="Agregar participante..."
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button type="button" onClick={() => addParticipant(newName)}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
                + Agregar
              </button>
            </div>
          </div>

          {/* Item assignment */}
          {participants.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">¿Quién paga qué?</p>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const raw = assignments[i] ?? participants;
                  const actual = raw.filter((n) => participants.includes(n));
                  return (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-800 truncate flex-1">{item.concept}</p>
                        <span className="text-sm font-bold text-gray-700 ml-2 flex-shrink-0">
                          ${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {participants.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleItemAssignee(i, name)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                              isAssigned(i, name) ? 'text-white border-transparent' : 'border-gray-200 text-gray-400 bg-white'
                            }`}
                            style={isAssigned(i, name) ? { backgroundColor: memberColor(name) } : {}}
                          >
                            {isAssigned(i, name) ? '✓ ' : ''}{name}
                          </button>
                        ))}
                      </div>
                      {actual.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1.5">
                          ${(item.amount / actual.length).toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tip */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Propina / extra (opcional)</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <div className="flex gap-2 items-center">
                <div className="flex gap-0.5 bg-white rounded-lg p-0.5 border border-gray-200">
                  <button type="button" onClick={() => setTipMode('pct')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${tipMode === 'pct' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>
                    %
                  </button>
                  <button type="button" onClick={() => setTipMode('fixed')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${tipMode === 'fixed' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>
                    $
                  </button>
                </div>
                <input
                  type="number"
                  value={tipValue}
                  onChange={(e) => setTipValue(e.target.value)}
                  placeholder={tipMode === 'pct' ? '10' : '50'}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                />
                {tipAmount > 0 && (
                  <span className="text-xs font-bold text-purple-700 flex-shrink-0">
                    = ${tipAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {participants.length > 1 && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 mb-1.5">
                    <input type="checkbox" checked={tipForAll} onChange={(e) => setTipForAll(e.target.checked)} className="rounded" />
                    Dividir entre todos
                  </label>
                  {!tipForAll && (
                    <div className="flex flex-wrap gap-1.5">
                      {participants.map((name) => {
                        const included = tipParticipants.includes(name);
                        return (
                          <button key={name} type="button"
                            onClick={() => setTipParticipants((p) => included ? p.filter((n) => n !== name) : [...p, name])}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                              included ? 'text-white border-transparent' : 'border-gray-200 text-gray-400 bg-white'
                            }`}
                            style={included ? { backgroundColor: memberColor(name) } : {}}>
                            {included ? '✓ ' : ''}{name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {participants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resumen</p>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                {participants.map((name, i) => (
                  <div key={name}
                    className={`flex items-center justify-between px-4 py-3 ${i < participants.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: memberColor(name) }}>
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      ${(perPerson[name] ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 border-t-2 border-gray-200 bg-white">
                  <span className="text-sm font-semibold text-gray-600">Total</span>
                  <span className="text-base font-extrabold text-gray-900">
                    ${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={copySummary}
                  className="flex-1 py-3 rounded-2xl border-2 border-purple-200 text-purple-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-purple-50 transition-all active:scale-95"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
                {onApplySplit && (
                  <button
                    type="button"
                    onClick={() => { onApplySplit(itemObligations); onClose(); }}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{ backgroundColor: '#0c6878' }}
                  >
                    <Check size={16} />
                    Aplicar división
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
