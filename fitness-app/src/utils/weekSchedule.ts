import type { Phase } from '../types'

const ALL_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] as const

// Rest-day-aware distributions for each day count
const TRAINING_DAYS: Record<number, string[]> = {
  2: ['Lun', 'Jue'],
  3: ['Lun', 'Mie', 'Vie'],
  4: ['Lun', 'Mar', 'Jue', 'Vie'],
  5: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'],
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
