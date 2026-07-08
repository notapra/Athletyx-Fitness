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
import { isSupabaseConfigured } from '../services/authService.js'
import {
  pushSessionToCloud,
  deleteSessionFromCloud,
  scheduleSyncAll,
  pullFromCloud,
} from '../services/syncService.js'
import { enqueueSyncOp } from '../services/offlineQueue.js'
import { useNetworkSync } from '../hooks/useNetworkSync.js'

export function AppProvider({ children }) {
  const { profile, userId } = useAuth()
  const effectiveUserId = userId ?? LOCAL_USER_ID
  const online = useNetworkSync(effectiveUserId)
  const cloudEnabled = isSupabaseConfigured && effectiveUserId !== LOCAL_USER_ID

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

      if (cloudEnabled) {
        enqueueSyncOp({ type: 'session', userId: effectiveUserId, session: finished }).then(() =>
          pushSessionToCloud(effectiveUserId, finished)
        )
      }

      return true
    },
    [profile, goals, sessions, effectiveUserId, cloudEnabled]
  )

  const dismissGuardianReminder = useCallback(() => {
    if (guardianReminder) {
      dismissReminder(effectiveUserId)
    }
    setGuardianReminder(null)
  }, [guardianReminder, effectiveUserId])

  const deleteSession = useCallback(
    (id) => {
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (cloudEnabled) {
        enqueueSyncOp({ type: 'delete_session', userId: effectiveUserId, clientId: id }).then(() =>
          deleteSessionFromCloud(effectiveUserId, id)
        )
      }
    },
    [cloudEnabled, effectiveUserId]
  )

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

  useEffect(() => {
    function onStorageReload() {
      reloadFromStorage()
    }
    window.addEventListener('ironlog:storage-reload', onStorageReload)
    return () => window.removeEventListener('ironlog:storage-reload', onStorageReload)
  }, [reloadFromStorage])

  const pullFromCloudHandler = useCallback(async () => {
    if (!cloudEnabled) return
    await pullFromCloud(effectiveUserId)
    reloadFromStorage()
  }, [cloudEnabled, effectiveUserId, reloadFromStorage])

  const scheduleSyncAllHandler = useCallback(() => {
    if (cloudEnabled) scheduleSyncAll(effectiveUserId)
  }, [cloudEnabled, effectiveUserId])

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
    online,
    cloudEnabled,
    pullFromCloud: pullFromCloudHandler,
    scheduleSyncAll: scheduleSyncAllHandler,
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
