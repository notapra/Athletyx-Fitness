import {
  loadProfile,
  saveProfile,
  getDefaultProfile,
  clearAllAppData,
  LOCAL_USER_ID,
} from '../utils/storage.js'

export { LOCAL_USER_ID }

export function fetchProfile() {
  return Promise.resolve(loadProfile())
}

export function updateProfile(_userId, updates) {
  const current = loadProfile()
  const updated = {
    ...current,
    ...updates,
    id: LOCAL_USER_ID,
    ai_preferences: {
      ...current.ai_preferences,
      ...(updates.ai_preferences ?? {}),
    },
    notification_preferences: updates.notification_preferences
      ? {
          ...current.notification_preferences,
          ...updates.notification_preferences,
          quiet_hours: {
            ...current.notification_preferences?.quiet_hours,
            ...updates.notification_preferences?.quiet_hours,
          },
        }
      : current.notification_preferences,
  }
  saveProfile(updated)
  return Promise.resolve(updated)
}

export function resetAllLocalData() {
  clearAllAppData()
  const profile = getDefaultProfile()
  saveProfile(profile)
  return Promise.resolve(profile)
}
