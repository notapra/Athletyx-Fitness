import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppContext } from './appContext.js'
import { useAuth } from '../hooks/useAuth.js'
import { LOCAL_USER_ID } from '../utils/storage.js'
import {
  loadSessions,
  saveSessions,
  loadBodyweight,
  saveBodyweight,
  loadGoals,
  saveGoals,
  loadActiveSession,
  saveActiveSession,
} from '../utils/storage.js'
import { migrateLegacyWorkout, createId, sessionHasValidSets } from '../utils/session.js'
import { normalizeSessions } from '../utils/calculations.js'
import { buildGoalContract } from '../utils/goalContract.js'
import { maybePostWorkoutReminder } from '../services/guardianService.js'
import { dismissReminder } from '../utils/reminderScheduler.js'

export function AppProvider({ children }) {
  const { profile, userId } = useAuth()
  const effectiveUserId = userId ?? LOCAL_USER_ID

  const [sessions, setSessions] = useState(() => loadSessions().map(migrateLegacyWorkout))
  const [bodyweight, setBodyweight] = useState(() => loadBodyweight())
  const [goals, setGoals] = useState(() => loadGoals())
  const [activeSession, setActiveSession] = useState(() => loadActiveSession())
  const [activeTab, setActiveTab] = useState('home')
  const [workoutMode, setWorkoutMode] = useState(false)
  const [sessionSummary, setSessionSummary] = useState(null)
  const [guardianReminder, setGuardianReminder] = useState(null)
  const [sessionGuardianNote, setSessionGuardianNote] = useState(null)

  useEffect(() => {
    const migrated = sessions.map(migrateLegacyWorkout)
    saveSessions(migrated)
  }, [sessions])

  useEffect(() => {
    saveBodyweight(bodyweight)
  }, [bodyweight])

  useEffect(() => {
    saveGoals(goals)
  }, [goals])

  useEffect(() => {
    saveActiveSession(activeSession)
  }, [activeSession])

  const normalizedSessions = useMemo(() => normalizeSessions(sessions), [sessions])

  const finishWorkout = useCallback(
    (session) => {
      if (!sessionHasValidSets(session)) return false
      const finished = { ...session, date: session.date ?? new Date().toISOString() }

      setSessions((prev) => {
        const exists = prev.some((s) => s.id === finished.id)
        if (exists) {
          return prev.map((s) => (s.id === finished.id ? finished : s))
        }
        return [finished, ...prev]
      })

      setActiveSession(null)
      setWorkoutMode(false)

      const contract = buildGoalContract(profile, goals, [finished, ...sessions])
      const { reminder, sessionNote } = maybePostWorkoutReminder({
        userId: effectiveUserId,
        profile,
        contract,
        session: finished,
        workoutMode: false,
      })
      if (reminder) setGuardianReminder(reminder)
      if (sessionNote) setSessionGuardianNote(sessionNote)

      return true
    },
    [profile, goals, sessions, effectiveUserId]
  )

  const dismissGuardianReminder = useCallback(() => {
    if (guardianReminder) {
      dismissReminder(effectiveUserId)
    }
    setGuardianReminder(null)
  }, [guardianReminder, effectiveUserId])

  const deleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const logBodyweight = useCallback((weight, date = new Date().toISOString()) => {
    const entry = { id: createId(), weight: Number(weight), date }
    setBodyweight((prev) => [entry, ...prev])
  }, [])

  const deleteBodyweightEntry = useCallback((id) => {
    setBodyweight((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const addGoal = useCallback((goal) => {
    const entry = { id: createId(), ...goal, createdAt: new Date().toISOString() }
    setGoals((prev) => [entry, ...prev])
  }, [])

  const toggleGoal = useCallback((id) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    )
  }, [])

  const startWorkout = useCallback((split = 'Upper') => {
    const session = {
      id: createId(),
      split,
      duration: 0,
      notes: '',
      date: new Date().toISOString(),
      startedAt: Date.now(),
      exercises: [],
    }
    setActiveSession(session)
    setWorkoutMode(true)
    return session
  }, [])

  const cancelWorkout = useCallback(() => {
    setActiveSession(null)
    setWorkoutMode(false)
  }, [])

  const reloadFromStorage = useCallback(() => {
    setSessions(loadSessions().map(migrateLegacyWorkout))
    setBodyweight(loadBodyweight())
    setGoals(loadGoals())
    setActiveSession(loadActiveSession())
  }, [])

  const value = {
    sessions: normalizedSessions,
    rawSessions: sessions,
    setSessions,
    bodyweight,
    goals,
    activeSession,
    setActiveSession,
    activeTab,
    setActiveTab,
    workoutMode,
    setWorkoutMode,
    sessionSummary,
    setSessionSummary,
    deleteSession,
    finishWorkout,
    startWorkout,
    cancelWorkout,
    logBodyweight,
    deleteBodyweight: deleteBodyweightEntry,
    addGoal,
    toggleGoal,
    syncing: false,
    dataReady: true,
    online: true,
    cloudEnabled: false,
    pullFromCloud: () => {},
    scheduleSyncAll: () => {},
    reloadFromStorage,
    userId: effectiveUserId,
    profile,
    guardianReminder,
    setGuardianReminder,
    dismissGuardianReminder,
    sessionGuardianNote,
    setSessionGuardianNote,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
