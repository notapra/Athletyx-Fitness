/**
 * Apple HealthKit / Google Health Connect — Stage 08 integration.
 */

import { Capacitor } from '@capacitor/core'
import { loadSessions, saveSessions } from '../utils/storage.js'
import {
  healthPlatformId,
  isImportableWorkoutType,
  mapHealthWorkoutToSession,
  sessionTimeRange,
} from '../utils/healthWorkoutMapper.js'

const STORAGE_KEY = 'ironlog_health_sync_prefs_v1'
const HEALTH_READ = ['workouts', 'calories', 'exerciseTime']
const HEALTH_WRITE = ['calories', 'exerciseTime']

let healthPlugin = null
let cachedStatus = null

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw
      ? JSON.parse(raw)
      : { enabled: false, lastImportAt: null, exportedSessionIds: [] }
  } catch {
    return { enabled: false, lastImportAt: null, exportedSessionIds: [] }
  }
}

function writePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

function defaultStatus(platform) {
  if (platform === 'ios') {
    return {
      available: false,
      platform: 'ios',
      provider: 'Apple HealthKit',
      message: 'Checking HealthKit availability…',
      permissionsRequired: HEALTH_READ,
    }
  }
  if (platform === 'android') {
    return {
      available: false,
      platform: 'android',
      provider: 'Health Connect',
      message: 'Checking Health Connect availability…',
      permissionsRequired: HEALTH_READ,
    }
  }
  return {
    available: false,
    platform: 'web',
    provider: null,
    message: 'Health sync is available on the iOS and Android app only.',
    permissionsRequired: [],
  }
}

async function getHealthPlugin() {
  if (!Capacitor.isNativePlatform()) return null
  if (!healthPlugin) {
    const mod = await import('@capgo/capacitor-health')
    healthPlugin = mod.Health
  }
  return healthPlugin
}

/** @returns {{ available: boolean, platform: string, provider: string | null, message: string, permissionsRequired: string[] }} */
export function getHealthSyncStatus() {
  return cachedStatus ?? defaultStatus(Capacitor.getPlatform())
}

export async function refreshHealthSyncStatus() {
  const platform = Capacitor.getPlatform()
  const base = defaultStatus(platform)
  if (platform === 'web') {
    cachedStatus = base
    return cachedStatus
  }

  try {
    const Health = await getHealthPlugin()
    if (!Health) {
      cachedStatus = { ...base, message: 'Native health plugin unavailable.' }
      return cachedStatus
    }
    const availability = await Health.isAvailable()
    if (!availability.available) {
      cachedStatus = {
        ...base,
        message: availability.reason || 'Health data is not available on this device.',
      }
      return cachedStatus
    }
    cachedStatus = {
      ...base,
      available: true,
      message:
        platform === 'ios'
          ? 'Import strength workouts and export finished IronLog sessions to Apple Health.'
          : 'Import strength workouts and export finished IronLog sessions to Health Connect.',
    }
    return cachedStatus
  } catch (err) {
    cachedStatus = {
      ...base,
      message: err?.message || 'Could not reach the native health SDK.',
    }
    return cachedStatus
  }
}

export async function isHealthSyncAvailable() {
  const status = await refreshHealthSyncStatus()
  return status.available
}

export function getHealthSyncPreferences() {
  return readPrefs()
}

export function setHealthSyncEnabled(enabled) {
  const prefs = readPrefs()
  prefs.enabled = Boolean(enabled)
  writePrefs(prefs)
  return prefs
}

function knownPlatformIds() {
  return new Set(
    loadSessions()
      .map((s) => s.healthSource?.platformId)
      .filter(Boolean)
  )
}

export async function requestHealthPermissions() {
  const status = await refreshHealthSyncStatus()
  if (!status.available) {
    return { granted: false, reason: status.message }
  }
  const Health = await getHealthPlugin()
  const auth = await Health.requestAuthorization({
    read: HEALTH_READ,
    write: HEALTH_WRITE,
    requestHistoryAccess: true,
  })
  const readOk = (auth.readAuthorized ?? []).length > 0
  return {
    granted: readOk,
    readAuthorized: auth.readAuthorized ?? [],
    writeAuthorized: auth.writeAuthorized ?? [],
    reason: readOk ? null : 'Health permissions were not granted.',
  }
}

export async function importWorkoutsFromHealth({ since } = {}) {
  const status = await refreshHealthSyncStatus()
  const prefs = readPrefs()
  if (!status.available) {
    return { imported: 0, workouts: [], message: status.message }
  }
  if (!prefs.enabled) {
    return { imported: 0, workouts: [], message: 'Health sync is disabled in Settings.' }
  }

  const Health = await getHealthPlugin()
  const startDate =
    since ||
    prefs.lastImportAt ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const endDate = new Date().toISOString()

  const { workouts = [] } = await Health.queryWorkouts({
    startDate,
    endDate,
    limit: 100,
    ascending: false,
  })

  const known = knownPlatformIds()
  const mapped = workouts
    .filter((w) => isImportableWorkoutType(w.workoutType))
    .filter((w) => !known.has(healthPlatformId(w)))
    .map(mapHealthWorkoutToSession)

  if (mapped.length) {
    const existing = loadSessions()
    saveSessions([...mapped, ...existing])
    window.dispatchEvent(new CustomEvent('ironlog:storage-reload'))
  }

  prefs.lastImportAt = endDate
  writePrefs(prefs)

  return {
    imported: mapped.length,
    workouts: mapped,
    message:
      mapped.length > 0
        ? `Imported ${mapped.length} workout${mapped.length === 1 ? '' : 's'} from ${status.provider}.`
        : 'No new workouts to import.',
  }
}

export async function exportWorkoutToHealth(session) {
  const status = await refreshHealthSyncStatus()
  const prefs = readPrefs()
  if (!status.available) {
    return { exported: false, message: status.message }
  }
  if (!prefs.enabled) {
    return { exported: false, message: 'Health sync is disabled in Settings.' }
  }
  if (!session?.id) {
    return { exported: false, message: 'Invalid session.' }
  }
  if ((prefs.exportedSessionIds ?? []).includes(session.id)) {
    return { exported: false, message: 'Session already exported to health.' }
  }

  const Health = await getHealthPlugin()
  const { startDate, endDate, durationMin } = sessionTimeRange(session)

  await Health.saveSample({
    dataType: 'exerciseTime',
    value: durationMin,
    unit: 'minute',
    startDate,
    endDate,
    metadata: {
      app: 'IronLog',
      sessionId: session.id,
      split: session.split || '',
    },
  })

  prefs.exportedSessionIds = [...(prefs.exportedSessionIds ?? []), session.id]
  writePrefs(prefs)

  return {
    exported: true,
    message: `Exported ${durationMin} min to ${status.provider}.`,
  }
}
