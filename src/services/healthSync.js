/**
 * Post-v1: Apple HealthKit / Google Health Connect integration stubs.
 * Wire native plugins when Capacitor health packages are added.
 */

export async function isHealthSyncAvailable() {
  return false
}

export async function requestHealthPermissions() {
  return { granted: false, reason: 'Health sync ships in a post-v1 update' }
}

export async function importWorkoutsFromHealth() {
  return { imported: 0, workouts: [] }
}

export async function exportWorkoutToHealth() {
  return { exported: false }
}
