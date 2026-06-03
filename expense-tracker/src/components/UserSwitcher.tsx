import { useState } from 'react';
import { X } from 'lucide-react';
import type { AppSpace } from '../types/space';
import { MEMBER_COLORS } from '../types/space';
import { PinPad } from './PinPad';

interface Props {
  space: AppSpace;
  currentMemberId: string;
  onSwitch: (memberId: string) => void;
  onClose: () => void;
}

export function UserSwitcher({ space, currentMemberId, onSwitch, onClose }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');

  const selectedMember = selectedMemberId
    ? space.members.find((m) => m.id === selectedMemberId)
    : null;

  const handleMemberTap = (memberId: string) => {
    if (memberId === currentMemberId) return; // already active
    setSelectedMemberId(memberId);
    setPinError('');
  };

  const handlePinConfirm = (pin: string) => {
    if (!selectedMember) return;
    if (pin === selectedMember.pin) {
      onSwitch(selectedMember.id);
    } else {
      setPinError('PIN incorrecto');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl shadow-2xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">Cambiar usuario</h2>
            <p className="text-xs text-gray-400">{space.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl">
            <X size={18} />
          </button>
        </div>

        {selectedMember ? (
          /* PIN pad for selected member */
          <div className="px-5 py-4">
            <p className="text-sm text-center text-gray-500 mb-2">
              Ingresa el PIN de <strong>{selectedMember.name}</strong>
            </p>
            <PinPad
              onConfirm={handlePinConfirm}
              onCancel={() => { setSelectedMemberId(null); setPinError(''); }}
              error={pinError}
              memberName={selectedMember.name}
              memberColor={MEMBER_COLORS[selectedMember.colorIndex]}
            />
          </div>
        ) : (
          /* Member list */
          <div className="px-5 py-4 space-y-2">
            {space.members.map((member) => {
              const isActive = member.id === currentMemberId;
              return (
                <button
                  key={member.id}
                  onClick={() => handleMemberTap(member.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
                    isActive
                      ? 'bg-teal-50 border-2 border-teal-300'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 active:scale-98'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                    style={{ backgroundColor: MEMBER_COLORS[member.colorIndex] }}
                  >
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{member.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{member.role}</p>
                  </div>
                  {isActive && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
                      Activo
                    </span>
                  )}
                  {!isActive && (
                    <span className="text-xs text-gray-300 flex-shrink-0">🔒</span>
                  )}
                </button>
              );
            })}
            <div className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
