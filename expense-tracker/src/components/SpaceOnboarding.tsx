import { useState } from 'react';
import type { AppSpace, SessionState } from '../types/space';
import { MEMBER_COLORS } from '../types/space';
import { generateSpaceId, generateMemberId, saveSpaces, saveSession } from '../utils/spaceStorage';
import { PinPad } from './PinPad';

interface Props {
  onComplete: (space: AppSpace, session: SessionState) => void;
  isSupabaseMode?: boolean;
}

type Step = 1 | 2 | 3 | 4;

interface AddedMember {
  name: string;
  colorIndex: number;
  pin: string;
}

export function SpaceOnboarding({ onComplete, isSupabaseMode = false }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [spaceName, setSpaceName] = useState('Mi Casa');
  const [maxMembers, setMaxMembers] = useState(5);

  // Step 2
  const [ownerName, setOwnerName] = useState('');
  const [ownerColorIndex, setOwnerColorIndex] = useState(0);

  // Step 3
  const [pinStep, setPinStep] = useState<'first' | 'confirm'>('first');
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Step 4
  const [members, setMembers] = useState<AddedMember[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColorIndex, setNewMemberColorIndex] = useState(1);
  const [newMemberPinStep, setNewMemberPinStep] = useState<'first' | 'confirm'>('first');
  const [newMemberFirstPin, setNewMemberFirstPin] = useState('');
  const [newMemberPinError, setNewMemberPinError] = useState('');

  const handleStep1 = () => {
    if (!spaceName.trim()) return;
    setStep(2);
  };

  const handleStep2 = () => {
    if (!ownerName.trim()) return;
    setStep(3);
  };

  const handlePinFirst = (pin: string) => {
    setFirstPin(pin);
    setPinStep('confirm');
    setPinError('');
  };

  const handlePinConfirm = (pin: string) => {
    if (pin !== firstPin) {
      setPinError('Los PINs no coinciden. Intenta de nuevo.');
      setPinStep('first');
      setFirstPin('');
      return;
    }
    if (isSupabaseMode) {
      handleFinish();
    } else {
      setStep(4);
    }
  };

  const handleAddMemberPin = (pin: string) => {
    if (newMemberPinStep === 'first') {
      setNewMemberFirstPin(pin);
      setNewMemberPinStep('confirm');
      setNewMemberPinError('');
    } else {
      if (pin !== newMemberFirstPin) {
        setNewMemberPinError('Los PINs no coinciden. Intenta de nuevo.');
        setNewMemberPinStep('first');
        setNewMemberFirstPin('');
        return;
      }
      // Add member
      setMembers((prev) => [...prev, { name: newMemberName, colorIndex: newMemberColorIndex, pin }]);
      setAddingMember(false);
      setNewMemberName('');
      setNewMemberColorIndex(members.length + 1 < MEMBER_COLORS.length ? members.length + 1 : 0);
      setNewMemberPinStep('first');
      setNewMemberFirstPin('');
      setNewMemberPinError('');
    }
  };

  const handleFinish = () => {
    const today = new Date().toISOString().slice(0, 10);
    const ownerId = generateMemberId();
    const spaceId = generateSpaceId();

    const spaceMembers = [
      {
        id: ownerId,
        name: ownerName.trim(),
        pin: firstPin,
        role: 'propietario' as const,
        colorIndex: ownerColorIndex,
        createdAt: today,
      },
      ...members.map((m, i) => ({
        id: generateMemberId(),
        name: m.name,
        pin: m.pin,
        role: 'editor' as const,
        colorIndex: m.colorIndex,
        createdAt: new Date(Date.now() + i + 1).toISOString().slice(0, 10),
      })),
    ];

    const space: AppSpace = {
      id: spaceId,
      name: spaceName.trim(),
      ownerId,
      members: spaceMembers,
      maxMembers,
      createdAt: today,
    };

    const session: SessionState = { spaceId, memberId: ownerId };
    saveSpaces([space]);
    saveSession(session);
    onComplete(space, session);
  };

  const totalMembers = 1 + members.length; // owner + extra members

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-7 text-white text-center"
          style={{ background: 'linear-gradient(135deg, #0c6878 0%, #2b8fa0 100%)' }}
        >
          {/* Logo — overlapping circles, consistent with login screen */}
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" className="mx-auto mb-3">
            <circle cx="24" cy="34" r="18" fill="white" opacity="0.9" />
            <circle cx="40" cy="34" r="18" fill="#f5a884" opacity="0.9" />
            <circle cx="32" cy="22" r="18" fill="white" opacity="0.55" />
          </svg>
          <p className="text-white/70 text-[11px] tracking-[0.2em] uppercase font-medium mb-0.5">by SOIHogar</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Orden Casa</h1>
          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 mt-4">
            {(isSupabaseMode ? [1,2,3] : [1,2,3,4]).map((s) => (
              <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Space name + max members */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Bienvenido a Orden Casa</h2>
                <p className="text-sm text-gray-500">Empieza creando tu primera lista de gastos</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Nombre del espacio
                </label>
                <input
                  type="text"
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  placeholder="Mi Casa, Departamento..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 font-medium"
                  onKeyDown={(e) => e.key === 'Enter' && handleStep1()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Máximo de miembros: <span className="text-teal-600">{maxMembers}</span>
                </label>
                <input
                  type="range" min={1} max={10} value={maxMembers}
                  onChange={(e) => setMaxMembers(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>10</span>
                </div>
              </div>
              <button
                onClick={handleStep1}
                disabled={!spaceName.trim()}
                className="w-full py-3 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Step 2: Owner name + color */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">¿Quién eres tú?</h2>
                <p className="text-sm text-gray-500">El primer miembro es el propietario del espacio</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tu nombre</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ivan, Ana, Papá..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 font-medium"
                  onKeyDown={(e) => e.key === 'Enter' && handleStep2()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tu color</label>
                <div className="flex flex-wrap gap-2">
                  {MEMBER_COLORS.map((color, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setOwnerColorIndex(i)}
                      className={`w-9 h-9 rounded-full transition-all ${ownerColorIndex === i ? 'ring-2 ring-offset-2 ring-teal-500 scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {ownerName && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: MEMBER_COLORS[ownerColorIndex] }}>
                      {ownerName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-600 font-medium">{ownerName}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-2xl font-medium text-sm">
                  Atrás
                </button>
                <button
                  onClick={handleStep2}
                  disabled={!ownerName.trim()}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: PIN setup */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  {pinStep === 'first' ? 'Crea tu PIN' : 'Confirma tu PIN'}
                </h2>
                <p className="text-sm text-gray-500">
                  {pinStep === 'first' ? 'Tu PIN de 4 dígitos protege tu sesión' : 'Ingresa el PIN de nuevo para confirmar'}
                </p>
              </div>
              <PinPad
                key={pinStep}
                onConfirm={pinStep === 'first' ? handlePinFirst : handlePinConfirm}
                onCancel={() => { setStep(2); setPinStep('first'); setFirstPin(''); setPinError(''); }}
                error={pinError}
                memberName={ownerName}
                memberColor={MEMBER_COLORS[ownerColorIndex]}
              />
            </div>
          )}

          {/* Step 4: Add more members */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Miembros del espacio</h2>
                <p className="text-sm text-gray-500">Puedes agregar más personas ahora o después</p>
              </div>

              {/* Member list */}
              <div className="space-y-2">
                {/* Owner */}
                <div className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: MEMBER_COLORS[ownerColorIndex] }}>
                    {ownerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{ownerName}</p>
                    <p className="text-xs text-teal-600">Propietario</p>
                  </div>
                </div>
                {members.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: MEMBER_COLORS[m.colorIndex] }}>
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-400">Editor</p>
                    </div>
                    <button onClick={() => setMembers((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1">
                      Quitar
                    </button>
                  </div>
                ))}
              </div>

              {/* Add member form */}
              {addingMember && (
                <div className="border border-teal-200 rounded-2xl p-4 space-y-3 bg-teal-50">
                  {newMemberPinStep === 'first' && !newMemberFirstPin && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre</label>
                        <input
                          type="text"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="Nombre del miembro..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                          {MEMBER_COLORS.map((color, i) => (
                            <button key={i} type="button" onClick={() => setNewMemberColorIndex(i)}
                              className={`w-8 h-8 rounded-full transition-all ${newMemberColorIndex === i ? 'ring-2 ring-offset-1 ring-teal-500 scale-110' : ''}`}
                              style={{ backgroundColor: color }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setAddingMember(false); setNewMemberName(''); }}
                          className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm">Cancelar</button>
                        <button
                          onClick={() => { if (newMemberName.trim()) setNewMemberFirstPin('_ready'); }}
                          disabled={!newMemberName.trim()}
                          className="flex-1 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold disabled:opacity-40">
                          Crear PIN
                        </button>
                      </div>
                    </>
                  )}
                  {(newMemberFirstPin || newMemberPinStep === 'confirm') && (
                    <>
                      <p className="text-sm font-semibold text-center text-gray-700">
                        {newMemberPinStep === 'first' ? `PIN para ${newMemberName}` : `Confirma el PIN de ${newMemberName}`}
                      </p>
                      <PinPad
                        key={newMemberPinStep}
                        onConfirm={handleAddMemberPin}
                        onCancel={() => { setAddingMember(false); setNewMemberName(''); setNewMemberPinStep('first'); setNewMemberFirstPin(''); }}
                        error={newMemberPinError}
                        memberName={newMemberName}
                        memberColor={MEMBER_COLORS[newMemberColorIndex]}
                      />
                    </>
                  )}
                </div>
              )}

              {!addingMember && totalMembers < maxMembers && (
                <button
                  onClick={() => {
                    setAddingMember(true);
                    setNewMemberPinStep('first');
                    setNewMemberFirstPin('');
                    setNewMemberColorIndex(totalMembers < MEMBER_COLORS.length ? totalMembers : 0);
                  }}
                  className="w-full py-2.5 border-2 border-dashed border-teal-300 text-teal-600 rounded-2xl text-sm font-medium hover:bg-teal-50 transition-all"
                >
                  + Agregar miembro
                </button>
              )}

              <button
                onClick={handleFinish}
                className="w-full py-3 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 active:scale-95 transition-all"
              >
                ¡Listo! Comenzar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
