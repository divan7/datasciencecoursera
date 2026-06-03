export type MemberRole = 'propietario' | 'editor' | 'lector';

export const ROLE_LABELS: Record<MemberRole, string> = {
  propietario: 'Propietario',
  editor: 'Editor',
  lector: 'Lector (solo lectura)',
};

export const MEMBER_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#ec4899','#14b8a6','#6366f1',
];

export interface SpaceMember {
  id: string;
  name: string;
  pin: string;        // 4-digit string, stored plain (no backend = no real security)
  role: MemberRole;
  colorIndex: number; // index into MEMBER_COLORS
  createdAt: string;
}

export type SpacePlan = 'free' | 'premium' | 'trial';

export interface AppSpace {
  id: string;
  name: string;
  ownerId: string;     // SpaceMember.id of the current owner
  members: SpaceMember[];
  maxMembers: number;  // 1–10, default 5
  createdAt: string;
  plan?: SpacePlan;   // free | premium | trial (default: trial = full access)
}

export interface SessionState {
  spaceId: string;
  memberId: string;
}
