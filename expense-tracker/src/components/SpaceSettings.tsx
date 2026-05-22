import { useState } from 'react';
import { Pencil, Trash2, Plus, ChevronRight } from 'lucide-react';
import type { AppSpace, SessionState, MemberRole, SpaceMember } from '../types/space';
import { MEMBER_COLORS, ROLE_LABELS } from '../types/space';
import { saveSpaces, saveSession, generateMemberId, generateSpaceId } from '../utils/spaceStorage';
import { PinPad } from './PinPad';

interface Props {
  spaces: AppSpace[];
  session: SessionState;
  onUpdateSpaces: (spaces: AppSpace[]) => void;
  onSwitchSpace: (spaceId: string, memberId: string) => void;
}

type EditView =
  | null
  | { type: 'editSpaceName' }
  | { type: 'addMember' }
  | { type: 'editMember'; memberId: string }
  | { type: 'deleteMember'; memberId: string }
  | { type: 'transferOwner' }
  | { type: 'newSpace' }
  | { type: 'newSpaceMember'; spaceName: string; maxMembers: number; ownerName: string; ownerColorIndex: number };

export function SpaceSettings({ spaces, session, onUpdateSpaces, onSwitchSpace }: Props) {
  const currentSpace = spaces.find((s) => s.id === session.spaceId)!;
  const currentMember = currentSpace?.members.find((m) => m.id === session.memberId);
  const isPropietario = currentMember?.role === 'propietario';

  const [view, setView] = useState<EditView>(null);
  const [editName, setEditName] = useState(currentSpace?.name ?? '');
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<MemberRole>('editor');
  const [editMemberColorIndex, setEditMemberColorIndex] = useState(0);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColorIndex, setNewMemberColorIndex] = useState(0);
  const [newMemberPinStep, setNewMemberPinStep] = useState<'first' | 'confirm'>('first');
  const [newMemberFirstPin, setNewMemberFirstPin] = useState('');
  const [newMemberPinError, setNewMemberPinError] = useState('');
  // New space flow
  const [nsName, setNsName] = useState('');
  const [nsMaxMembers, setNsMaxMembers] = useState(5);
  const [nsOwnerName, setNsOwnerName] = useState('');
  const [nsOwnerColor, setNsOwnerColor] = useState(0);
  const [nsPinStep, setNsPinStep] = useState<'first' | 'confirm' | 'done'>('first');
  const [nsFirstPin, setNsFirstPin] = useState('');
  const [nsPinError, setNsPinError] = useState('');

  if (!currentSpace || !currentMember) return null;

  const updateCurrentSpace = (updater: (s: AppSpace) => AppSpace) => {
    const updated = spaces.map((s) => s.id === currentSpace.id ? updater(s) : s);
    onUpdateSpaces(updated);
    saveSpaces(updated);
  };

  const handleSaveName = () => {
    if (!editName.trim()) return;
    updateCurrentSpace((s) => ({ ...s, name: editName.trim() }));
    setView(null);
  };

  const startEditMember = (member: SpaceMember) => {
    setEditMemberName(member.name);
    setEditMemberRole(member.role);
    setEditMemberColorIndex(member.colorIndex);
    setView({ type: 'editMember', memberId: member.id });
  };

  const handleSaveMember = (memberId: string) => {
    updateCurrentSpace((s) => ({
      ...s,
      members: s.members.map((m) =>
        m.id === memberId
          ? { ...m, name: editMemberName.trim() || m.name, role: editMemberRole, colorIndex: editMemberColorIndex }
          : m
      ),
    }));
    setView(null);
  };

  const handleDeleteMember = (memberId: string) => {
    if (confirmDel !== memberId) {
      setConfirmDel(memberId);
      setTimeout(() => setConfirmDel(null), 3000);
      return;
    }
    updateCurrentSpace((s) => ({
      ...s,
      members: s.members.filter((m) => m.id !== memberId),
    }));
    setConfirmDel(null);
    setView(null);
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
      const today = new Date().toISOString().slice(0, 10);
      const newMember: SpaceMember = {
        id: generateMemberId(),
        name: newMemberName.trim(),
        pin,
        role: 'editor',
        colorIndex: newMemberColorIndex,
        createdAt: today,
      };
      updateCurrentSpace((s) => ({ ...s, members: [...s.members, newMember] }));
      setView(null);
      setNewMemberName('');
      setNewMemberPinStep('first');
      setNewMemberFirstPin('');
    }
  };

  const handleTransferOwner = (memberId: string) => {
    updateCurrentSpace((s) => ({
      ...s,
      ownerId: memberId,
      members: s.members.map((m) => ({
        ...m,
        role: m.id === memberId ? 'propietario' : m.id === s.ownerId ? 'editor' : m.role,
      })),
    }));
    setView(null);
  };

  const handleNewSpacePin = (pin: string) => {
    if (nsPinStep === 'first') {
      setNsFirstPin(pin);
      setNsPinStep('confirm');
      setNsPinError('');
    } else if (nsPinStep === 'confirm') {
      if (pin !== nsFirstPin) {
        setNsPinError('Los PINs no coinciden. Intenta de nuevo.');
        setNsPinStep('first');
        setNsFirstPin('');
        return;
      }
      // Create space
      const today = new Date().toISOString().slice(0, 10);
      const ownerId = generateMemberId();
      const spaceId = generateSpaceId();
      const newSpace: AppSpace = {
        id: spaceId,
        name: nsName.trim(),
        ownerId,
        maxMembers: nsMaxMembers,
        createdAt: today,
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
      onSwitchSpace(spaceId, ownerId);
      setView(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current space card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800">Espacio actual</h2>
          {isPropietario && view === null && (
            <button onClick={() => { setEditName(currentSpace.name); setView({ type: 'editSpaceName' }); }}
              className="p-1.5 text-gray-400 hover:text-teal-600">
              <Pencil size={15} />
            </button>
          )}
        </div>

        {view?.type === 'editSpaceName' ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleSaveName} className="flex-1 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold">Guardar</button>
              <button onClick={() => setView(null)} className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm">Cancelar</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-gray-900">{currentSpace.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{currentSpace.members.length}/{currentSpace.maxMembers} miembros</p>
          </div>
        )}

        {/* Max members slider — propietario only */}
        {isPropietario && view === null && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Máximo de miembros: <span className="text-teal-600">{currentSpace.maxMembers}</span>
            </label>
            <input
              type="range" min={currentSpace.members.length} max={10} value={currentSpace.maxMembers}
              onChange={(e) => updateCurrentSpace((s) => ({ ...s, maxMembers: Number(e.target.value) }))}
              className="w-full accent-teal-600"
            />
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800">Miembros</h2>
          {isPropietario && view === null && currentSpace.members.length < currentSpace.maxMembers && (
            <button onClick={() => { setNewMemberName(''); setNewMemberPinStep('first'); setNewMemberFirstPin(''); setView({ type: 'addMember' }); }}
              className="flex items-center gap-1 text-xs text-teal-600 font-semibold">
              <Plus size={14} /> Agregar
            </button>
          )}
        </div>

        {/* Add member form */}
        {view?.type === 'addMember' && (
          <div className="mb-3 border border-teal-200 rounded-xl p-3 bg-teal-50 space-y-3">
            {!newMemberFirstPin && newMemberPinStep === 'first' ? (
              <>
                <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Nombre del miembro..." autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <div className="flex flex-wrap gap-1.5">
                  {MEMBER_COLORS.map((color, i) => (
                    <button key={i} type="button" onClick={() => setNewMemberColorIndex(i)}
                      className={`w-7 h-7 rounded-full transition-all ${newMemberColorIndex === i ? 'ring-2 ring-offset-1 ring-teal-500' : ''}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setView(null)} className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs">Cancelar</button>
                  <button onClick={() => { if (newMemberName.trim()) setNewMemberFirstPin('_ready'); }}
                    disabled={!newMemberName.trim()}
                    className="flex-1 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold disabled:opacity-40">
                    Siguiente: PIN
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-center text-gray-600 font-semibold">
                  {newMemberPinStep === 'first' ? `PIN para ${newMemberName}` : `Confirmar PIN de ${newMemberName}`}
                </p>
                <PinPad
                  key={newMemberPinStep}
                  onConfirm={handleAddMemberPin}
                  onCancel={() => { setView(null); setNewMemberPinStep('first'); setNewMemberFirstPin(''); }}
                  error={newMemberPinError}
                  memberName={newMemberName}
                  memberColor={MEMBER_COLORS[newMemberColorIndex]}
                />
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          {currentSpace.members.map((member) => (
            <div key={member.id}>
              {view?.type === 'editMember' && view.memberId === member.id ? (
                <div className="border border-teal-200 rounded-xl p-3 bg-teal-50 space-y-2">
                  <input type="text" value={editMemberName} onChange={(e) => setEditMemberName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" autoFocus />
                  <div className="flex flex-wrap gap-1.5">
                    {MEMBER_COLORS.map((color, i) => (
                      <button key={i} type="button" onClick={() => setEditMemberColorIndex(i)}
                        className={`w-7 h-7 rounded-full transition-all ${editMemberColorIndex === i ? 'ring-2 ring-offset-1 ring-teal-600' : ''}`}
                        style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  {member.role !== 'propietario' && (
                    <select value={editMemberRole} onChange={(e) => setEditMemberRole(e.target.value as MemberRole)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                      {(Object.entries(ROLE_LABELS) as [MemberRole, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveMember(member.id)} className="flex-1 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold">Guardar</button>
                    <button onClick={() => setView(null)} className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: MEMBER_COLORS[member.colorIndex] }}>
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[member.role]}</p>
                  </div>
                  {isPropietario && view === null && (
                    <div className="flex gap-1">
                      <button onClick={() => startEditMember(member)} className="p-1.5 text-gray-400 hover:text-teal-600">
                        <Pencil size={13} />
                      </button>
                      {member.id !== session.memberId && (
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className={`p-1.5 transition-colors ${confirmDel === member.id ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Transfer ownership */}
        {isPropietario && view === null && currentSpace.members.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button onClick={() => setView({ type: 'transferOwner' })}
              className="text-xs text-amber-600 font-medium hover:underline">
              Transferir propiedad a otro miembro
            </button>
          </div>
        )}

        {view?.type === 'transferOwner' && (
          <div className="mt-3 border border-amber-200 rounded-xl p-3 bg-amber-50">
            <p className="text-xs font-semibold text-amber-800 mb-2">Selecciona el nuevo propietario:</p>
            <div className="space-y-1.5">
              {currentSpace.members.filter((m) => m.role !== 'propietario').map((m) => (
                <button key={m.id} onClick={() => handleTransferOwner(m.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg hover:bg-amber-50 text-left">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: MEMBER_COLORS[m.colorIndex] }}>
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{m.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setView(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
        )}
      </div>

      {/* Other spaces */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-base font-bold text-gray-800 mb-3">Mis listas</h2>
        <div className="space-y-2">
          {spaces.map((sp) => {
            const isActive = sp.id === session.spaceId;
            const myMember = sp.members.find((m) => m.id === session.memberId) ?? sp.members[0];
            return (
              <div key={sp.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                isActive ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-transparent'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{sp.name}</p>
                  <p className="text-xs text-gray-400">{sp.members.length} miembros</p>
                </div>
                {isActive ? (
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">Activa</span>
                ) : (
                  <button
                    onClick={() => onSwitchSpace(sp.id, myMember.id)}
                    className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline"
                  >
                    Cambiar <ChevronRight size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* New space flow */}
        {view?.type === 'newSpace' ? (
          <div className="mt-3 border border-teal-200 rounded-xl p-3 bg-teal-50 space-y-3">
            <p className="text-sm font-bold text-teal-800">Nueva lista</p>
            <input type="text" value={nsName} onChange={(e) => setNsName(e.target.value)}
              placeholder="Nombre del espacio..." autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Máx. miembros: {nsMaxMembers}</label>
              <input type="range" min={1} max={10} value={nsMaxMembers}
                onChange={(e) => setNsMaxMembers(Number(e.target.value))} className="w-full accent-teal-600" />
            </div>
            <input type="text" value={nsOwnerName} onChange={(e) => setNsOwnerName(e.target.value)}
              placeholder="Tu nombre en este espacio..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <div className="flex flex-wrap gap-1.5">
              {MEMBER_COLORS.map((color, i) => (
                <button key={i} type="button" onClick={() => setNsOwnerColor(i)}
                  className={`w-7 h-7 rounded-full transition-all ${nsOwnerColor === i ? 'ring-2 ring-offset-1 ring-teal-500' : ''}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
            {nsName.trim() && nsOwnerName.trim() && (
              <>
                <p className="text-xs text-center text-gray-600 font-semibold">
                  {nsPinStep === 'first' ? 'Crea tu PIN' : 'Confirma tu PIN'}
                </p>
                <PinPad
                  key={nsPinStep}
                  onConfirm={handleNewSpacePin}
                  onCancel={() => { setView(null); setNsName(''); setNsOwnerName(''); setNsPinStep('first'); setNsFirstPin(''); }}
                  error={nsPinError}
                  memberName={nsOwnerName}
                  memberColor={MEMBER_COLORS[nsOwnerColor]}
                />
              </>
            )}
            {!(nsName.trim() && nsOwnerName.trim()) && (
              <div className="flex gap-2">
                <button onClick={() => setView(null)} className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm">Cancelar</button>
                <button disabled className="flex-1 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold opacity-40">Continuar</button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => { setView({ type: 'newSpace' }); setNsName(''); setNsOwnerName(''); setNsPinStep('first'); setNsFirstPin(''); setNsPinError(''); }}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-teal-300 text-teal-600 rounded-2xl text-sm font-medium hover:bg-teal-50 transition-all"
          >
            + Nueva lista
          </button>
        )}
      </div>
    </div>
  );
}
