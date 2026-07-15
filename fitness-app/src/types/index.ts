export type Gender = 'male' | 'female' | 'other'
export type FitnessLevel = 1 | 2 | 3 | 4 | 5
export type Equipment = 'home' | 'gym'
export type MuscleGroup =
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'calves'
  | 'full_body'
  | 'mobility'

export type MuscleFocusId = 'legs' | 'back' | 'arms' | 'chest' | 'shoulders' | 'core'
export type MusclePriority = 'high' | 'medium' | 'maintenance'

export interface MuscleFocusConfig {
  id: MuscleFocusId
  label: string
  emoji: string
  muscles: MuscleGroup[]
  goal: string
}

export type MusclePriorityMap = Record<MuscleFocusId, MusclePriority>

export interface UserProfile {
  id: string
  name: string
  age: number
  weight: number
  height: number
  gender: Gender
  injuries: string[]
  fitnessLevel: FitnessLevel
  goals: string[]
  targetSport: string
  equipment: Equipment[]
  availableTime: number
  musclePriorities: MusclePriorityMap
  createdAt: string
}

export interface Exercise {
  id: string
  name: string
  nameEs: string
  description: string
  muscles: MuscleGroup[]
  duration?: number
  sets?: number
  reps?: number | string
  restSeconds: number
  difficulty: 1 | 2 | 3
  equipment: Equipment[]
  kneeSafe: boolean
  instructions: string[]
  tips: string[]
  source: string
  phase: number[]
  videoKeyword: string
}

export interface WorkoutExercise {
  exerciseId: string
  sets: number
  reps: number | string
  restSeconds: number
  notes?: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  dayLabel: string
  focus: string
  estimatedMinutes: number
  exercises: WorkoutExercise[]
}

export interface Phase {
  id: number
  name: string
  description: string
  durationWeeks: number
  workoutsPerWeek: number
  targetMinutes: [number, number]
  location: Equipment[]
  advancementCriteria: string[]
  weekSchedule: { [key: string]: string }
  workouts: WorkoutTemplate[]
}

export interface Program {
  id: string
  userId: string
  name: string
  currentPhaseIndex: number
  currentWeek: number
  startDate: string
  phases: Phase[]
}

export interface ExerciseLog {
  exerciseId: string
  setsCompleted: number
  repsCompleted: (number | string)[]
  felt: 1 | 2 | 3 | 4 | 5
}

export interface WorkoutLog {
  id: string
  userId: string
  date: string
  workoutTemplateId: string
  phaseId: number
  week: number
  completed: boolean
  durationMinutes: number
  exercises: ExerciseLog[]
  notes: string
  overallFeel: 1 | 2 | 3 | 4 | 5
}

export interface BodyMetrics {
  id: string
  userId: string
  date: string
  weight: number
  waist?: number
  hips?: number
  chest?: number
  thigh?: number
  energy: 1 | 2 | 3 | 4 | 5
  sleep: 1 | 2 | 3 | 4 | 5
  mood: 1 | 2 | 3 | 4 | 5
  notes: string
}

export interface AppState {
  users: UserProfile[]
  activeUserId: string | null
  programs: Program[]
  workoutLogs: WorkoutLog[]
  bodyMetrics: BodyMetrics[]
}
