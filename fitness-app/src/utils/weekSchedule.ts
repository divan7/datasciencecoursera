import type { Phase } from '../types'

const ALL_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] as const

// Evidence-based distributions — source: ACSM guidelines, RP/Israetel MEV-MRV model, Athlean-X
// Rule: same muscle group needs ≥48 h before re-stimulation (beginners 48–72 h).
// 3 days → Mon/Wed/Fri full-body (48 h between sessions, gold standard ACSM)
// 4 days → Mon/Tue/Thu/Fri upper-lower (muscle-specific 48 h gap, RP standard)
// 5 days → Mon/Tue/Wed/Fri/Sat PPL hybrid, Thursday rest (midweek rest prevents accumulation)
// 6 days → Mon-Sat double-PPL, Sunday rest (each muscle still hits 72 h gap in cycle)
const TRAINING_DAYS: Record<number, string[]> = {
  2: ['Lun', 'Jue'],
  3: ['Lun', 'Mie', 'Vie'],
  4: ['Lun', 'Mar', 'Jue', 'Vie'],
  5: ['Lun', 'Mar', 'Mie', 'Vie', 'Sab'],
  6: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
}

export function computeWeekSchedule(
  phase: Phase,
  preferredDays?: number
): Record<string, string> {
  const target = preferredDays ?? phase.workoutsPerWeek
  const trainingDays = TRAINING_DAYS[target] ?? TRAINING_DAYS[phase.workoutsPerWeek]

  // Extract distinct workout labels in order (A, B, C, D … skipping Descanso/Opcional)
  const seen = new Set<string>()
  const labels: string[] = []
  for (const val of Object.values(phase.weekSchedule)) {
    if (val !== 'Descanso' && val !== 'Opcional' && !seen.has(val)) {
      seen.add(val)
      labels.push(val)
    }
  }

  const schedule: Record<string, string> = {}
  ALL_DAYS.forEach(day => { schedule[day] = 'Descanso' })
  trainingDays.forEach((day, i) => { schedule[day] = labels[i % labels.length] })

  return schedule
}

export function effectiveDaysPerWeek(phase: Phase, preferredDays?: number): number {
  return preferredDays ?? phase.workoutsPerWeek
}

// Returns null (ok), 'caution', or 'overload' based on research thresholds.
// Beginners (phase 1-2): MEV=2-3, MRV=4; >4 days exceeds recovery capacity (ACSM 48-72h rule).
// Intermediate (phase 3-4): MEV=3, MRV=5; 6 days is above maximum recoverable volume.
// Advanced (phase 5): MEV=4, MRV=6; full range is valid with managed per-session volume.
export function overloadStatus(
  phaseId: number,
  days: number
): null | 'caution' | 'overload' {
  if (phaseId <= 2) {
    if (days === 4) return 'caution'
    if (days >= 5) return 'overload'
  } else if (phaseId <= 4) {
    if (days === 6) return 'caution'
  }
  return null
}
