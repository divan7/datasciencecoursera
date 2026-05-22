import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { AppSpace, SessionState } from '../types/space';
import { MEMBER_COLORS } from '../types/space';
import { PinPad } from './PinPad';
import { generateMemberId, generateSpaceId, saveSpaces, saveSession } from '../utils/spaceStorage';

interface Props {
  spaces: AppSpace[];
  session: SessionState;
  onSwitch: (spaceId: string, memberId: string) => void;
  onUpdateSpaces: (spaces: AppSpace[]) => void;
}

type Modal = 'new' | { type: 'confirmDelete'; spaceId: string } | null;
type PinStep = 'first' | 'confirm';

export function SpacePicker({ spaces, session, onSwitch, onUpdateSpaces }: Props) {
  const [modal, setModal] = useState<Modal>(null);

  // ── New space form state ──────────────────────────────────────
  const [nsName, setNsName]               = useState('');
  const [nsOwnerName, setNsOwnerName]     = useState('');
  const [nsOwnerColor, setNsOwnerColor]   = useState(0);
  const [nsPinStep, setNsPinStep]         = useState<PinStep>('first');
  const [nsFirstPin, setNsFirstPin]       = useState('');
  const [nsPinError, setNsPinError]       = useState('');

  const resetNewForm = () => {
    setNsName(''); setNsOwnerName(''); setNsOwnerColor(0);
    setNsPinStep('first'); setNsFirstPin(''); setNsPinError('');
  };

  const handleNewSpacePin = (pin: string) => {
    if (nsPinStep === 'first') {
      setNsFirstPin(pin);
      setNsPinStep('confirm');
      setNsPinError('');
    } else {
      if (pin !== nsFirstPin) {
        setNsPinError('Los PINs no coinciden');
        setNsPinStep('first');
        setNsFirstPin('');
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const ownerId = generateMemberId();
      const spaceId = generateSpaceId();
      const newSpace: AppSpace = {
        id: spaceId,
        name: nsName.trim(),
        ownerId,
        maxMembers: 5,
        createdAt: today,
        plan: 'trial',
        members: [{
          id: ownerId,
          name: nsOwnerName.trim(),
          pin,
          role: 'propietario',
          colorIndex: nsOwnerColor,
          createdAt: today,
        }],
      };
      const updated = [...spaces, newSpace];
      onUpdateSpaces(updated);
      saveSpaces(updated);
      saveSession({ spaceId, memberId: ownerId });
      onSwitch(spaceId, ownerId);
      setModal(null);
      resetNewForm();
    }
  };

  const handleDelete = (spaceId: string) => {
    if (spaceId === session.spaceId) return; // can't delete active space
    // Clean up all scoped localStorage keys for this space
    ['expense_tracker_data', 'expense_tracker_settings',
     'fixed_expense_templates', 'monthly_checks'].forEach((key) => {
      localStorage.removeItem(`${key}_${spaceId}`);
    });
    const updated = spaces.filter((s) => s.id !== spaceId);
    onUpdateSpaces(updated);
    saveSpaces(updated);
    setModal(null);
  };

  const handleChipSwitch = (spaceId: string) => {
    if (spaceId === session.spaceId) return;
    const space = spaces.find((s) => s.id === spaceId);
    if (!space) return;
    // Switch to first member of that space
    const firstMember = space.members[0];
    if (firstMember) onSwitch(spaceId, firstMember.id);
  };

  const formReady = nsName.trim() && nsOwnerName.trim();

  return (
    <>
      {/* ── Chip bar ────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {spaces.map((sp) => {
            const isActive = sp.id === session.spaceId;
            const member = sp.members[0];
            return (
              <div key={sp.id} className="flex items-center flex-shrink-0 rounded-full overflow-hidden border transition-all"
                style={isActive
                  ? { backgroundColor: 'var(--soi-teal)', borderColor: 'var(--soi-teal)' }
                  : { backgroundColor: '#fff', borderColor: '#e5e7eb' }}>

                {/* Chip — tap to switch */}
                <button
                  onClick={() => handleChipSwitch(sp.id)}
                  className={`flex items-center gap-2 pl-3 pr-3 py-2 text-sm font-semibold transition-all ${
                    isActive ? 'text-white' : 'text-gray-600 hover:text-teal-700'
                  }`}
                  disabled={isActive}
                >
                  {member && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: MEMBER_COLORS[member.colorIndex], fontSize: '9px' }}
                    >
                      {member.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[110px] truncate">{sp.name}</span>
                  {isActive && <span className="text-teal-200 text-xs">✓</span>}
                </button>

                {/* Delete — only for inactive, full-height tappable strip */}
                {!isActive && (
                  <button
                    onClick={() => setModal({ type: 'confirmDelete', spaceId: sp.id })}
                    className="px-2.5 py-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors border-l border-gray-100"
                    title="Eliminar lista"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add new space button */}
          <button
            onClick={() => { resetNewForm(); setModal('new'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold bg-white border-2 border-dashed border-gray-300 text-gray-400 hover:border-teal-400 hover:text-teal-600 transition-all flex-shrink-0"
          >
            <Plus size={14} />
            <span>Nueva lista</span>
          </button>
        </div>
      </div>

      {/* ── New space modal ──────────────────────────────────────── */}
      {modal === 'new' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { setModal(null); resetNewForm(); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Nueva lista</h2>
              <button onClick={() => { setModal(null); resetNewForm(); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {!formReady || nsPinStep === 'first' && !nsFirstPin ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nombre de la lista *</label>
                    <input
                      type="text"
                      value={nsName}
                      onChange={(e) => setNsName(e.target.value)}
                      placeholder="Mi Casa, Oficina, Departamento..."
                      autoFocus
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tu nombre en esta lista *</label>
                    <input
                      type="text"
                      value={nsOwnerName}
                      onChange={(e) => setNsOwnerName(e.target.value)}
                      placeholder="¿Cómo te llamamos aquí?"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tu color</label>
                    <div className="flex gap-2 flex-wrap">
                      {MEMBER_COLORS.map((color, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNsOwnerColor(i)}
                          className={`w-8 h-8 rounded-full transition-all ${nsOwnerColor === i ? 'ring-2 ring-offset-2 ring-teal-500 scale-110' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (formReady) setNsFirstPin('_ready'); }}
                    disabled={!formReady}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40"
                    style={{ backgroundColor: 'var(--soi-teal)' }}
                  >
                    Continuar → Crear PIN
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-center font-semibold text-gray-700">
                    {nsPinStep === 'first' ? `Crea tu PIN — ${nsOwnerName}` : `Confirma tu PIN`}
                  </p>
                  <PinPad
                    key={nsPinStep}
                    onConfirm={handleNewSpacePin}
                    onCancel={() => { setModal(null); resetNewForm(); }}
                    error={nsPinError}
                    memberName={nsOwnerName}
                    memberColor={MEMBER_COLORS[nsOwnerColor]}
                  />
                </>
              )}
            </div>

            <div className="h-safe-bottom" />
          </div>
        </div>
      )}

      {/* ── Confirm delete modal ─────────────────────────────────── */}
      {modal !== null && modal !== 'new' && modal.type === 'confirmDelete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-xs bg-white rounded-3xl shadow-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-base font-bold text-gray-800 mb-1">¿Eliminar lista?</h3>
            <p className="text-xs text-gray-500 mb-1">
              <strong>{spaces.find((s) => s.id === modal.spaceId)?.name}</strong>
            </p>
            <p className="text-xs text-red-500 mb-5">
              Se borrarán todos los gastos y configuraciones de esta lista. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(modal.spaceId)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
              >
                Eliminar
              </button>
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
