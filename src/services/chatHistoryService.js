/**
 * IronCoach chat history — localStorage + Supabase ai_chat_history sync.
 */

import { getSupabase, isSupabaseConfigured } from './supabaseClient.js'
import { LOCAL_USER_ID } from '../utils/storage.js'

const LOCAL_CHAT_KEY = 'gymtracker_ai_chat_v1'
const CHAT_MIGRATED_KEY = 'ironlog_chat_migrated_v1'

const WELCOME =
  "I'm IronCoach, your AI personal trainer. I analyze your workouts, recovery, and progression in real time — kept on track by Goal Guardian. Ask me anything about training, nutrition, or recovery."

function loadLocalRaw() {
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalRaw(messages) {
  try {
    localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(messages.slice(-50)))
  } catch {
    /* storage full */
  }
}

function toUiMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content ?? row.message,
    createdAt: row.created_at ?? row.createdAt,
  }
}

export async function fetchCloudChatHistory(userId) {
  const sb = getSupabase()
  if (!sb || !userId || userId === LOCAL_USER_ID) return []

  const { data, error } = await sb
    .from('ai_chat_history')
    .select('id, role, message, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.warn('Cloud chat fetch failed', error.message)
    return []
  }

  return (data ?? []).map((row) => toUiMessage({ ...row, content: row.message }))
}

export async function getChatHistory(userId = LOCAL_USER_ID) {
  if (isSupabaseConfigured && userId && userId !== LOCAL_USER_ID) {
    const cloud = await fetchCloudChatHistory(userId)
    if (cloud.length > 0) {
      saveLocalRaw(cloud.map((m) => ({ id: m.id, role: m.role, content: m.content })))
      return cloud
    }
  }

  const local = loadLocalRaw()
  if (local.length > 0) {
    return local.map((m) => toUiMessage(m))
  }

  return [{ id: 'welcome', role: 'assistant', content: WELCOME }]
}

export async function persistMessage(role, content, userId = LOCAL_USER_ID) {
  const id = crypto.randomUUID?.() ?? `m-${Date.now()}`
  const entry = { id, role, content }

  const history = loadLocalRaw()
  history.push(entry)
  saveLocalRaw(history)

  if (isSupabaseConfigured && userId && userId !== LOCAL_USER_ID) {
    const sb = getSupabase()
    const { error } = await sb.from('ai_chat_history').insert({
      user_id: userId,
      role,
      message: content,
    })
    if (error) console.warn('Cloud chat persist failed', error.message)
  }

  return history
}

export async function clearChatHistory(userId = LOCAL_USER_ID) {
  localStorage.removeItem(LOCAL_CHAT_KEY)

  if (isSupabaseConfigured && userId && userId !== LOCAL_USER_ID) {
    const sb = getSupabase()
    const { error } = await sb.from('ai_chat_history').delete().eq('user_id', userId)
    if (error) console.warn('Cloud chat clear failed', error.message)
  }
}

export async function migrateLocalChatToCloud(userId) {
  if (!isSupabaseConfigured || !userId || userId === LOCAL_USER_ID) return
  if (localStorage.getItem(CHAT_MIGRATED_KEY) === 'true') return

  const local = loadLocalRaw().filter((m) => m.role === 'user' || m.role === 'assistant')
  if (!local.length) {
    localStorage.setItem(CHAT_MIGRATED_KEY, 'true')
    return
  }

  const sb = getSupabase()
  const rows = local.map((m) => ({
    user_id: userId,
    role: m.role,
    message: m.content ?? m.message,
    created_at: m.createdAt ?? new Date().toISOString(),
  }))

  const { error } = await sb.from('ai_chat_history').insert(rows)
  if (!error) localStorage.setItem(CHAT_MIGRATED_KEY, 'true')
}

export async function pullChatFromCloud(userId) {
  if (!isSupabaseConfigured || !userId || userId === LOCAL_USER_ID) return
  const cloud = await fetchCloudChatHistory(userId)
  if (cloud.length) {
    saveLocalRaw(cloud.map((m) => ({ id: m.id, role: m.role, content: m.content })))
  }
}
