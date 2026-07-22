/**
 * Apple HealthKit / Google Health Connect — Stage 08 integration layer.
 * Native plugins wire in a follow-up; this module owns status + import/export contracts.
 */

import { Capacitor } from '@capacitor/core'

const STORAGE_KEY = 'ironlog_health_sync_prefs_v1'

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { enabled: false, lastImportAt: null }
  } catch {
    return { enabled: false, lastImportAt: null }
  }
}

function writePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

/** @returns {{ available: boolean, platform: string, provider: string | null, message: string, permissionsRequired: string[] }} */
export function getHealthSyncStatus() {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') {
    return {
      available: false,
      platform: 'ios',
      provider: 'Apple HealthKit',
      message: 'HealthKit import/export ships in the next native build.',
      permissionsRequired: ['workouts', 'active_energy'],
    }
  }
  if (platform === 'android') {
    return {
      available: false,
      platform: 'android',
      provider: 'Health Connect',
      message: 'Health Connect sync ships in the next native build.',
      permissionsRequired: ['workouts', 'active_energy'],
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

export async function isHealthSyncAvailable() {
  return getHealthSyncStatus().available
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

export async function requestHealthPermissions() {
  const status = getHealthSyncStatus()
  if (!status.available) {
    return { granted: false, reason: status.message }
  }
  return { granted: false, reason: 'Native health permissions not wired yet' }
}

export async function importWorkoutsFromHealth() {
  const status = getHealthSyncStatus()
  if (!status.available) {
    return { imported: 0, workouts: [], message: status.message }
  }
  return { imported: 0, workouts: [], message: 'Native import not wired yet' }
}

export async function exportWorkoutToHealth() {
  const status = getHealthSyncStatus()
  if (!status.available) {
    return { exported: false, message: status.message }
  }
  return { exported: false, message: 'Native export not wired yet' }
}
