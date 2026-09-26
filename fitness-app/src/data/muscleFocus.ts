import type { MuscleFocusConfig, MuscleFocusId, MusclePriorityMap } from '../types'

export const muscleFocusGroups: MuscleFocusConfig[] = [
  {
    id: 'legs',
    label: 'Piernas',
    emoji: '🦵',
    muscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    goal: 'Fuerza y resistencia — base para correr',
  },
  {
    id: 'back',
    label: 'Espalda',
    emoji: '🔙',
    muscles: ['back'],
    goal: 'Postura, musculatura y protección lumbar',
  },
  {
    id: 'arms',
    label: 'Brazos',
    emoji: '💪',
    muscles: ['arms'],
    goal: 'Volumen y definición de bíceps y tríceps',
  },
  {
    id: 'chest',
    label: 'Pecho',
    emoji: '🫀',
    muscles: ['chest'],
    goal: 'Fuerza de empuje y masa pectoral',
  },
  {
    id: 'shoulders',
    label: 'Hombros',
    emoji: '⚡',
    muscles: ['shoulders'],
    goal: 'Estabilidad articular y amplitud de hombros',
  },
  {
    id: 'core',
    label: 'Core / Abdomen',
    emoji: '🎯',
    muscles: ['core'],
    goal: 'Reducción de cintura y estabilidad de columna',
  },
]

export const defaultMusclePriorities: MusclePriorityMap = {
  legs: 'medium',
  back: 'medium',
  arms: 'medium',
  chest: 'medium',
  shoulders: 'medium',
  core: 'medium',
}

export const priorityConfig: Record<
  string,
  { label: string; color: string; bg: string; border: string; description: string }
> = {
  high: {
    label: 'Alta prioridad',
    color: 'text-cyan-300',
    bg: 'bg-cyan-400/15',
    border: 'border-cyan-400/50',
    description: 'Mayor volumen y enfoque — zona prioritaria',
  },
  medium: {
    label: 'Prioridad media',
    color: 'text-violet-300',
    bg: 'bg-violet-400/15',
    border: 'border-violet-400/40',
    description: 'Desarrollo balanceado estándar',
  },
  maintenance: {
    label: 'Mantenimiento',
    color: 'text-zinc-400',
    bg: 'bg-zinc-800',
    border: 'border-zinc-700',
    description: 'Trabajo mínimo para mantener función',
  },
}

// Maps which MuscleGroup values correspond to each MuscleFocusId
export const muscleFocusMap: Record<MuscleFocusId, string[]> = {
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  back: ['back'],
  arms: ['arms'],
  chest: ['chest'],
  shoulders: ['shoulders'],
  core: ['core'],
}
