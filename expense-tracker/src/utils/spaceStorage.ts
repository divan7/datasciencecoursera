import type { AppSpace, SessionState } from '../types/space';
import type { AppSettings } from './storage';
import { spacesDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';

const SPACES_KEY = 'orden_casa_spaces';
const SESSION_KEY = 'orden_casa_session';

export function loadSpaces(): AppSpace[] {
  try { return JSON.parse(localStorage.getItem(SPACES_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveSpaces(spaces: AppSpace[]): void {
  localStorage.setItem(SPACES_KEY, JSON.stringify(spaces));
}

export function loadSession(): SessionState | null {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function saveSession(session: SessionState | null): void {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export function generateSpaceId(): string {
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

export function generateMemberId(): string {
  return `mb_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

// Load from Supabase, cache to localStorage
export async function loadSpacesFromSupabase(): Promise<AppSpace[]> {
  if (!isSupabaseConfigured) return loadSpaces();
  const remote = await spacesDb.listMySpaces();
  if (remote.length > 0) {
    saveSpaces(remote);
  }
  return remote.length > 0 ? remote : loadSpaces();
}

// Sync a full space (create or update) to Supabase
export async function syncSpaceToSupabase(space: AppSpace, ownerProfileId?: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (ownerProfileId) {
    await spacesDb.createSpace(space, ownerProfileId);
  } else {
    await spacesDb.updateSpace(space);
  }
}

// Migration: if spaces don't exist yet but old data does, create a default space
export function migrateFromLegacy(legacySettings: AppSettings | null): AppSpace | null {
  if (loadSpaces().length > 0) return null;

  const memberId1 = generateMemberId();
  const memberId2 = generateMemberId();
  const spaceId = 'sp_legacy';

  const name1 = legacySettings?.userName1 ?? 'Ivan';
  const name2 = legacySettings?.userName2 ?? 'Esposa';

  const oldData = localStorage.getItem('expense_tracker_data');
  if (oldData) localStorage.setItem(`expense_tracker_data_${spaceId}`, oldData);
  const oldSettings = localStorage.getItem('expense_tracker_settings');
  if (oldSettings) localStorage.setItem(`expense_tracker_settings_${spaceId}`, oldSettings);
  const oldTemplates = localStorage.getItem('fixed_expense_templates');
  if (oldTemplates) localStorage.setItem(`fixed_expense_templates_${spaceId}`, oldTemplates);
  const oldChecks = localStorage.getItem('monthly_checks');
  if (oldChecks) localStorage.setItem(`monthly_checks_${spaceId}`, oldChecks);

  const today = new Date().toISOString().slice(0, 10);
  const space: AppSpace = {
    id: spaceId,
    name: 'Mi Casa',
    ownerId: memberId1,
    maxMembers: 5,
    createdAt: today,
    members: [
      { id: memberId1, name: name1, pin: '0000', role: 'propietario', colorIndex: 0, createdAt: today },
      { id: memberId2, name: name2, pin: '0000', role: 'editor', colorIndex: 1, createdAt: today },
    ],
  };

  saveSpaces([space]);
  saveSession({ spaceId, memberId: memberId1 });
  return space;
}
