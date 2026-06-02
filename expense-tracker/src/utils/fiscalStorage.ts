import type { FiscalProfile } from '../types/fiscal';

const key = (userId: string) => `fiscal_profile_${userId}`;

export function loadFiscalProfile(userId: string): FiscalProfile {
  try {
    return JSON.parse(localStorage.getItem(key(userId)) ?? '{}');
  } catch {
    return {};
  }
}

export function saveFiscalProfile(profile: FiscalProfile, userId: string): void {
  localStorage.setItem(key(userId), JSON.stringify(profile));
}

export function hasFiscalProfile(userId: string): boolean {
  const p = loadFiscalProfile(userId);
  return !!(p.rfc || p.regimenFiscal || (p.regimenes && p.regimenes.length > 0));
}
