import {
  loadProfile,
  saveProfile,
  getDefaultProfile,
  clearAllAppData,
  LOCAL_USER_ID,
} from '../utils/storage.js'
import { getSupabase, isSupabaseConfigured } from './supabaseClient.js'
import {
  migrateLocalToCloud,
  pullFromCloud,
  pushProfileToCloud,
  processSyncQueue,
  scheduleSyncAll,
} from './syncService.js'

export { LOCAL_USER_ID, isSupabaseConfigured }

export async function fetchProfile(userId = LOCAL_USER_ID) {
  if (!isSupabaseConfigured || userId === LOCAL_USER_ID) {
    return loadProfile()
  }
  const sb = getSupabase()
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single()
  if (!data) return loadProfile()
  const local = loadProfile()
  const merged = {
    ...local,
    id: data.id,
    username: data.username ?? local.username,
    email: data.email ?? local.email,
    fitness_goal: data.fitness_goal ?? local.fitness_goal,
    experience_level: data.experience_level ?? local.experience_level,
    units: data.units ?? local.units,
    dark_mode: data.dark_mode ?? local.dark_mode,
    age: data.age ?? local.age,
    ai_preferences: { ...local.ai_preferences, ...(data.ai_preferences ?? {}) },
    notification_preferences: {
      ...local.notification_preferences,
      ...(data.notification_preferences ?? {}),
    },
  }
  saveProfile(merged)
  return merged
}

export async function updateProfile(userId, updates) {
  const current = loadProfile()
  const updated = {
    ...current,
    ...updates,
    id: userId,
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
  if (isSupabaseConfigured && userId !== LOCAL_USER_ID) {
    await pushProfileToCloud(userId, updated)
    await scheduleSyncAll(userId)
  }
  return updated
}

export async function signUp(email, password, username) {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const sb = getSupabase()
  if (sb) await sb.auth.signOut()
}

export async function resetPassword(email) {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  })
  if (error) throw error
}

export async function onAuthSession(user) {
  if (!user?.id) return loadProfile()
  await migrateLocalToCloud(user.id)
  await pullFromCloud(user.id)
  await processSyncQueue(user.id)
  return fetchProfile(user.id)
}

export function resetAllLocalData() {
  clearAllAppData()
  const profile = getDefaultProfile()
  saveProfile(profile)
  return Promise.resolve(profile)
}

export function getSession() {
  const sb = getSupabase()
  if (!sb) return Promise.resolve(null)
  return sb.auth.getSession().then(({ data }) => data.session)
}

export function onAuthStateChange(callback) {
  const sb = getSupabase()
  if (!sb) return { data: { subscription: { unsubscribe: () => {} } } }
  return sb.auth.onAuthStateChange(callback)
}
