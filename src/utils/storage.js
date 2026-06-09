import { DEFAULT_GUARDIAN_PREFS } from './goalContract.js'

export const LOCAL_USER_ID = 'local'

const SESSIONS_KEY = 'gymtracker_sessions_v2'
const LEGACY_KEY = 'gymtracker_workouts_v1'
const BODYWEIGHT_KEY = 'gymtracker_bodyweight_v1'
const GOALS_KEY = 'gymtracker_goals_v1'
const ACTIVE_KEY = 'gymtracker_active_session'
const PROFILE_KEY = 'gymtracker_profile_v1'
const CHAT_KEY = 'gymtracker_ai_chat_v1'
const GUARDIAN_PREFIX = 'gymtracker_guardian_reminders_'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.warn(`GymTracker: could not persist ${key}`)
  }
}

export function loadSessions() {
  const v2 = read(SESSIONS_KEY, null)
  if (Array.isArray(v2) && v2.length > 0) return v2

  const legacy = read(LEGACY_KEY, [])
  if (Array.isArray(legacy) && legacy.length > 0) {
    return legacy
  }

  return []
}

export function saveSessions(sessions) {
  write(SESSIONS_KEY, sessions)
}

export function loadBodyweight() {
  const data = read(BODYWEIGHT_KEY, [])
  return Array.isArray(data) ? data : []
}

export function saveBodyweight(entries) {
  write(BODYWEIGHT_KEY, entries)
}

export function loadGoals() {
  const data = read(GOALS_KEY, [])
  return Array.isArray(data) ? data : []
}

export function saveGoals(goals) {
  write(GOALS_KEY, goals)
}

export function loadActiveSession() {
  return read(ACTIVE_KEY, null)
}

export function saveActiveSession(session) {
  if (!session) {
    localStorage.removeItem(ACTIVE_KEY)
    return
  }
  write(ACTIVE_KEY, session)
}

export function loadWorkouts() {
  return loadSessions()
}

export function saveWorkouts(workouts) {
  saveSessions(workouts)
}

export function getDefaultProfile() {
  return {
    id: LOCAL_USER_ID,
    username: 'Athlete',
    fitness_goal: '',
    experience_level: 'intermediate',
    units: 'lbs',
    dark_mode: true,
    age: null,
    ai_preferences: {
      constraints: [],
      personal_factors: {
        max_effort_level: 'moderate',
        injury_history: [],
        movement_restrictions: [],
        recovery_capacity: 'average',
        medical_clearance: true,
        notes: '',
      },
    },
    notification_preferences: { ...DEFAULT_GUARDIAN_PREFS },
  }
}

export function loadProfile() {
  const data = read(PROFILE_KEY, null)
  if (!data || typeof data !== 'object') return getDefaultProfile()
  return {
    ...getDefaultProfile(),
    ...data,
    id: LOCAL_USER_ID,
    ai_preferences: {
      ...getDefaultProfile().ai_preferences,
      ...(data.ai_preferences ?? {}),
    },
    notification_preferences: {
      ...DEFAULT_GUARDIAN_PREFS,
      ...(data.notification_preferences ?? {}),
      quiet_hours: {
        ...DEFAULT_GUARDIAN_PREFS.quiet_hours,
        ...(data.notification_preferences?.quiet_hours ?? {}),
      },
    },
  }
}

export function saveProfile(profile) {
  write(PROFILE_KEY, { ...profile, id: LOCAL_USER_ID })
}

export function clearAllAppData() {
  localStorage.removeItem(SESSIONS_KEY)
  localStorage.removeItem(LEGACY_KEY)
  localStorage.removeItem(BODYWEIGHT_KEY)
  localStorage.removeItem(GOALS_KEY)
  localStorage.removeItem(ACTIVE_KEY)
  localStorage.removeItem(PROFILE_KEY)
  localStorage.removeItem(CHAT_KEY)
  localStorage.removeItem(`${GUARDIAN_PREFIX}${LOCAL_USER_ID}`)
  localStorage.removeItem(`${GUARDIAN_PREFIX}local`)
  try {
    sessionStorage.removeItem('gymtracker_drift_warnings')
  } catch {
    /* ignore */
  }
}
