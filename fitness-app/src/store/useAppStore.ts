import { useState, useEffect, useCallback } from 'react'
import type { AppState, UserProfile, Program, WorkoutLog, BodyMetrics } from '../types'
import { programPhases } from '../data/programs'
import { defaultMusclePriorities } from '../data/muscleFocus'
import { format, differenceInDays, parseISO } from 'date-fns'

export type InsightCadence = 'every_workout' | 'weekly' | 'biweekly' | 'manual'

const INSIGHT_CADENCE_KEY = 'fitprogress_insight_cadence'
const INSIGHT_LAST_SHOWN_KEY = 'fitprogress_insight_last_shown'

function loadInsightCadence(): InsightCadence {
  return (localStorage.getItem(INSIGHT_CADENCE_KEY) as InsightCadence) ?? 'weekly'
}

function loadInsightLastShown(): string | null {
  return localStorage.getItem(INSIGHT_LAST_SHOWN_KEY)
}

const STORAGE_KEY = 'fitprogress_data'

const defaultState: AppState = {
  users: [],
  activeUserId: null,
  programs: [],
  workoutLogs: [],
  bodyMetrics: [],
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as AppState
    const users = parsed.users?.map(u => ({
      ...u,
      musclePriorities: u.musclePriorities ?? { ...defaultMusclePriorities },
      activeLocation: (u as UserProfile).activeLocation ?? 'home',
    })) ?? []
    return { ...defaultState, ...parsed, users }
  } catch {
    return defaultState
  }
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

let globalState = loadState()
const listeners = new Set<() => void>()

function setState(updater: (prev: AppState) => AppState) {
  globalState = updater(globalState)
  saveState(globalState)
  listeners.forEach(fn => fn())
}

export function useAppStore() {
  const [, rerender] = useState(0)
  const [insightCadence, setInsightCadenceState] = useState<InsightCadence>(loadInsightCadence)
  const [insightLastShown, setInsightLastShownState] = useState<string | null>(loadInsightLastShown)

  useEffect(() => {
    const fn = () => rerender(n => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  const setInsightCadence = useCallback((c: InsightCadence) => {
    localStorage.setItem(INSIGHT_CADENCE_KEY, c)
    setInsightCadenceState(c)
  }, [])

  const markInsightShown = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    localStorage.setItem(INSIGHT_LAST_SHOWN_KEY, today)
    setInsightLastShownState(today)
  }, [])

  const state = globalState

  const activeUser = state.users.find(u => u.id === state.activeUserId) ?? null

  const activeProgram = state.programs.find(p => p.userId === state.activeUserId) ?? null

  const createUser = useCallback((data: Omit<UserProfile, 'id' | 'createdAt'>) => {
    const user: UserProfile = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    const program: Program = {
      id: generateId(),
      userId: user.id,
      name: 'Mi Programa de Acondicionamiento',
      currentPhaseIndex: 0,
      currentWeek: 1,
      startDate: new Date().toISOString(),
      phases: programPhases,
    }
    setState(prev => ({
      ...prev,
      users: [...prev.users, user],
      programs: [...prev.programs, program],
      activeUserId: user.id,
    }))
    return user
  }, [])

  const updateUser = useCallback((id: string, data: Partial<UserProfile>) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === id ? { ...u, ...data } : u)),
    }))
  }, [])

  const setActiveUser = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeUserId: id }))
  }, [])

  const logWorkout = useCallback((log: Omit<WorkoutLog, 'id'>) => {
    const entry: WorkoutLog = { ...log, id: generateId() }
    setState(prev => ({
      ...prev,
      workoutLogs: [...prev.workoutLogs, entry],
    }))
    return entry
  }, [])

  const logMetrics = useCallback((metrics: Omit<BodyMetrics, 'id'>) => {
    const entry: BodyMetrics = { ...metrics, id: generateId() }
    setState(prev => ({
      ...prev,
      bodyMetrics: [...prev.bodyMetrics.filter(m =>
        !(m.userId === metrics.userId && m.date === metrics.date)
      ), entry],
    }))
    return entry
  }, [])

  const advancePhase = useCallback(() => {
    if (!activeProgram) return
    const nextIndex = activeProgram.currentPhaseIndex + 1
    if (nextIndex >= programPhases.length) return
    setState(prev => ({
      ...prev,
      programs: prev.programs.map(p =>
        p.id === activeProgram.id
          ? { ...p, currentPhaseIndex: nextIndex, currentWeek: 1 }
          : p
      ),
    }))
  }, [activeProgram])

  const advanceWeek = useCallback(() => {
    if (!activeProgram) return
    const currentPhase = programPhases[activeProgram.currentPhaseIndex]
    if (!currentPhase) return
    if (activeProgram.currentWeek >= currentPhase.durationWeeks) return
    setState(prev => ({
      ...prev,
      programs: prev.programs.map(p =>
        p.id === activeProgram.id
          ? { ...p, currentWeek: p.currentWeek + 1 }
          : p
      ),
    }))
  }, [activeProgram])

  const getUserWorkoutLogs = useCallback((userId: string) => {
    return state.workoutLogs.filter(l => l.userId === userId)
  }, [state.workoutLogs])

  const getUserMetrics = useCallback((userId: string) => {
    return state.bodyMetrics
      .filter(m => m.userId === userId)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [state.bodyMetrics])

  const getTodayWorkoutLog = useCallback((userId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return state.workoutLogs.find(l => l.userId === userId && l.date === today) ?? null
  }, [state.workoutLogs])

  const getWeekCompletionRate = useCallback((userId: string, phaseId: number, week: number) => {
    const logs = state.workoutLogs.filter(
      l => l.userId === userId && l.phaseId === phaseId && l.week === week && l.completed
    )
    const phase = programPhases.find(p => p.id === phaseId)
    if (!phase) return 0
    return Math.min(1, logs.length / phase.workoutsPerWeek)
  }, [state.workoutLogs])

  const getTotalWorkoutsCompleted = useCallback((userId: string) => {
    return state.workoutLogs.filter(l => l.userId === userId && l.completed).length
  }, [state.workoutLogs])

  const getCurrentStreak = useCallback((userId: string) => {
    const logs = state.workoutLogs
      .filter(l => l.userId === userId && l.completed)
      .map(l => l.date)
      .sort()
      .reverse()
    if (logs.length === 0) return 0
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 60; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      if (logs.includes(dateStr)) {
        streak++
      } else if (streak > 0) {
        break
      }
    }
    return streak
  }, [state.workoutLogs])

  // Should a coach insight appear right now given the cadence?
  const shouldShowInsight = useCallback((): boolean => {
    if (insightCadence === 'manual') return false
    if (!insightLastShown) return true
    const daysSince = differenceInDays(new Date(), parseISO(insightLastShown))
    if (insightCadence === 'every_workout') return true
    if (insightCadence === 'weekly') return daysSince >= 7
    if (insightCadence === 'biweekly') return daysSince >= 14
    return false
  }, [insightCadence, insightLastShown])

  return {
    state,
    activeUser,
    activeProgram,
    createUser,
    updateUser,
    setActiveUser,
    logWorkout,
    logMetrics,
    advancePhase,
    advanceWeek,
    getUserWorkoutLogs,
    getUserMetrics,
    getTodayWorkoutLog,
    getWeekCompletionRate,
    getTotalWorkoutsCompleted,
    getCurrentStreak,
    generateId,
    insightCadence,
    setInsightCadence,
    markInsightShown,
    shouldShowInsight,
  }
}
