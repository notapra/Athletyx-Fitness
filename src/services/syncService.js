/**
 * Supabase sync — push localStorage data on first login, background sync after mutations.
 */

import { getSupabase } from './supabaseClient.js'
import {
  loadSessions,
  saveSessions,
  loadBodyweight,
  saveBodyweight,
  loadGoals,
  saveGoals,
  loadProfile,
  saveProfile,
  LOCAL_USER_ID,
} from '../utils/storage.js'
import { migrateLegacyWorkout } from '../utils/session.js'
import { enqueueSyncOp, drainSyncQueue } from './offlineQueue.js'

const MIGRATION_KEY = 'ironlog_cloud_migrated_v1'

export function isCloudMigrated() {
  return localStorage.getItem(MIGRATION_KEY) === 'true'
}

function markCloudMigrated() {
  localStorage.setItem(MIGRATION_KEY, 'true')
}

function profileToRow(profile, userId) {
  return {
    id: userId,
    username: profile.username,
    email: profile.email,
    fitness_goal: profile.fitness_goal,
    experience_level: profile.experience_level,
    units: profile.units,
    dark_mode: profile.dark_mode,
    age: profile.age,
    ai_preferences: profile.ai_preferences ?? {},
    notification_preferences: profile.notification_preferences ?? {},
    updated_at: new Date().toISOString(),
  }
}

function rowToProfile(row) {
  const local = loadProfile()
  return {
    ...local,
    id: row.id,
    username: row.username ?? local.username,
    email: row.email ?? local.email,
    fitness_goal: row.fitness_goal ?? local.fitness_goal,
    experience_level: row.experience_level ?? local.experience_level,
    units: row.units ?? local.units,
    dark_mode: row.dark_mode ?? local.dark_mode,
    age: row.age ?? local.age,
    ai_preferences: { ...local.ai_preferences, ...(row.ai_preferences ?? {}) },
    notification_preferences: {
      ...local.notification_preferences,
      ...(row.notification_preferences ?? {}),
    },
  }
}

async function upsertSession(sb, userId, session) {
  const s = migrateLegacyWorkout(session)
  const now = new Date().toISOString()
  const { data: ws, error } = await sb
    .from('workout_sessions')
    .upsert(
      {
        user_id: userId,
        client_id: s.id,
        split: s.split ?? 'Upper',
        duration: s.duration ?? 0,
        notes: s.notes ?? '',
        started_at: s.date ?? s.startedAt,
        created_at: s.date ?? new Date().toISOString(),
        updated_at: now,
      },
      { onConflict: 'user_id,client_id' }
    )
    .select('id')
    .single()

  if (error) throw error

  await sb.from('exercise_entries').delete().eq('session_id', ws.id)

  for (let ei = 0; ei < (s.exercises ?? []).length; ei++) {
    const block = s.exercises[ei]
    const { data: entry, error: eeErr } = await sb
      .from('exercise_entries')
      .insert({
        session_id: ws.id,
        exercise_name: block.exercise ?? block.exercise_name ?? 'Unknown',
        sort_order: ei,
      })
      .select('id')
      .single()
    if (eeErr) throw eeErr

    const setRows = (block.sets ?? []).map((set, si) => ({
      exercise_entry_id: entry.id,
      reps: Number(set.reps) || 0,
      weight: Number(set.weight) || 0,
      sort_order: si,
    }))
    if (setRows.length) {
      const { error: setErr } = await sb.from('sets').insert(setRows)
      if (setErr) throw setErr
    }
  }
}

async function sessionFromRow(sb, row) {
  const { data: entries } = await sb
    .from('exercise_entries')
    .select('id, exercise_name, sort_order')
    .eq('session_id', row.id)
    .order('sort_order')

  const exercises = []
  for (const entry of entries ?? []) {
    const { data: sets } = await sb
      .from('sets')
      .select('reps, weight, sort_order')
      .eq('exercise_entry_id', entry.id)
      .order('sort_order')

    exercises.push({
      exercise: entry.exercise_name,
      sets: (sets ?? []).map((s) => ({ reps: s.reps, weight: s.weight })),
    })
  }

  return {
    id: row.client_id ?? row.id,
    split: row.split,
    duration: row.duration ?? 0,
    notes: row.notes ?? '',
    date: row.created_at ?? row.started_at,
    exercises,
  }
}

export async function migrateLocalToCloud(userId) {
  const sb = getSupabase()
  if (!sb || !userId || isCloudMigrated()) return { migrated: false }

  const profile = loadProfile()
  await sb.from('profiles').upsert(profileToRow(profile, userId))

  for (const session of loadSessions()) {
    await upsertSession(sb, userId, session)
  }

  for (const bw of loadBodyweight()) {
    await sb.from('bodyweight_logs').upsert(
      {
        user_id: userId,
        client_id: bw.id,
        weight: bw.weight,
        created_at: bw.date ?? bw.created_at ?? new Date().toISOString(),
      },
      { onConflict: 'user_id,client_id' }
    )
  }

  for (const goal of loadGoals()) {
    await sb.from('goals').upsert(
      {
        user_id: userId,
        client_id: goal.id,
        title: goal.title,
        target: goal.target,
        completed: goal.completed ?? false,
        created_at: goal.createdAt ?? new Date().toISOString(),
      },
      { onConflict: 'user_id,client_id' }
    )
  }

  markCloudMigrated()
  return { migrated: true }
}

export async function pullFromCloud(userId) {
  const sb = getSupabase()
  if (!sb || !userId) return

  const { data: profileRow } = await sb.from('profiles').select('*').eq('id', userId).single()
  if (profileRow) saveProfile(rowToProfile(profileRow))

  const { data: sessionRows } = await sb
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const sessions = []
  for (const row of sessionRows ?? []) {
    sessions.push(await sessionFromRow(sb, row))
  }
  if (sessions.length) saveSessions(sessions)

  const { data: bwRows } = await sb
    .from('bodyweight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (bwRows?.length) {
    saveBodyweight(
      bwRows.map((r) => ({
        id: r.client_id ?? r.id,
        weight: Number(r.weight),
        date: r.created_at,
      }))
    )
  }

  const { data: goalRows } = await sb.from('goals').select('*').eq('user_id', userId)
  if (goalRows?.length) {
    saveGoals(
      goalRows.map((r) => ({
        id: r.client_id ?? r.id,
        title: r.title,
        target: r.target,
        completed: r.completed,
        createdAt: r.created_at,
      }))
    )
  }
}

export async function pushProfileToCloud(userId, profile) {
  const sb = getSupabase()
  if (!sb || !userId) return
  await sb.from('profiles').upsert(profileToRow(profile, userId))
}

export async function pushSessionToCloud(userId, session) {
  const sb = getSupabase()
  if (!sb || !userId) return
  await upsertSession(sb, userId, session)
}

export async function scheduleSyncAll(userId) {
  if (!userId || userId === LOCAL_USER_ID) return
  await enqueueSyncOp({ type: 'full', userId })
}

export async function processSyncQueue(userId) {
  if (!userId || userId === LOCAL_USER_ID) return

  await drainSyncQueue(async (item) => {
    if (item.type === 'full') {
      const profile = loadProfile()
      await pushProfileToCloud(userId, profile)
      for (const s of loadSessions()) await pushSessionToCloud(userId, s)
    }
    if (item.type === 'session' && item.session) {
      await pushSessionToCloud(userId, item.session)
    }
    if (item.type === 'profile' && item.profile) {
      await pushProfileToCloud(userId, item.profile)
    }
  })
}

export async function requestAccountDeletion(userId) {
  const sb = getSupabase()
  if (!sb || !userId) throw new Error('Cloud not configured')
  const { error } = await sb.from('account_deletion_requests').insert({ user_id: userId })
  if (error) throw error
}

export async function exportUserData(userId) {
  const sb = getSupabase()
  if (!sb || !userId) throw new Error('Cloud not configured')

  const [profile, sessions, bodyweight, goals, chat, coachCache] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).single(),
    sb.from('workout_sessions').select('*').eq('user_id', userId),
    sb.from('bodyweight_logs').select('*').eq('user_id', userId),
    sb.from('goals').select('*').eq('user_id', userId),
    sb.from('ai_chat_history').select('*').eq('user_id', userId).order('created_at'),
    sb.from('coach_query_cache').select('*').eq('user_id', userId),
  ])

  return {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    workout_sessions: sessions.data,
    bodyweight_logs: bodyweight.data,
    goals: goals.data,
    ai_chat_history: chat.data,
    coach_query_cache: coachCache.data,
  }
}

export async function fetchConsents(userId) {
  const sb = getSupabase()
  if (!sb || !userId) return null
  const { data } = await sb.from('user_consents').select('*').eq('user_id', userId).single()
  return data
}

export async function updateConsents(userId, consents) {
  const sb = getSupabase()
  if (!sb || !userId) return
  await sb.from('user_consents').upsert({
    user_id: userId,
    ...consents,
    updated_at: new Date().toISOString(),
  })
}
