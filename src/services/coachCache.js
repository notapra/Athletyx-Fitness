/**
 * Client-side coach response cache — skips network/API when the same query was answered before.
 */

const DB_NAME = 'ironlog_coach_cache_v1'
const STORE = 'responses'
const STATS_KEY = 'ironlog_coach_cache_stats_v1'
const DB_VERSION = 1
const MAX_ENTRIES = 200
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const WEB_TTL_MS = 24 * 60 * 60 * 1000

function normalizeQuery(text) {
  return (text || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function profileFingerprint(profile, goals = []) {
  const pf = profile?.ai_preferences?.personal_factors ?? {}
  return [
    profile?.fitness_goal ?? '',
    profile?.experience_level ?? '',
    profile?.units ?? 'lbs',
    profile?.age ?? '',
    [...(pf.injury_history ?? pf.injuries ?? [])].sort().join(','),
    [...(pf.movement_restrictions ?? [])].sort().join(','),
    pf.max_effort_level ?? pf.effort_level ?? '',
    goals?.length ?? 0,
  ].join('|')
}

async function hashKey(message, profile, goals) {
  const raw = `${normalizeQuery(message)}::${profileFingerprint(profile, goals)}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
  })
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

function recordEvent(event, detail = {}) {
  const stats = { hits: 0, misses: 0, saves: 0, ...loadStats() }
  if (event === 'hit') stats.hits += 1
  if (event === 'miss') stats.misses += 1
  if (event === 'save') stats.saves += 1
  stats.lastEvent = { event, at: new Date().toISOString(), ...detail }
  saveStats(stats)
  return stats
}

export function getCoachCacheStats() {
  return loadStats()
}

async function hashKeyForCloud(message, profile, goals) {
  return (await hashKey(message, profile, goals)).slice(0, 64)
}

export async function getCloudCachedCoachResponse(userId, message, { profile, goals = [] }) {
  const { getSupabase, isSupabaseConfigured } = await import('./supabaseClient.js')
  if (!isSupabaseConfigured || !userId) return { hit: false }

  const sb = getSupabase()
  const cacheKey = await hashKeyForCloud(message, profile, goals)
  const { data } = await sb
    .from('coach_query_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
    .maybeSingle()

  if (!data) {
    recordCloudCoachCacheEvent(userId, 'miss', { cache_key: cacheKey.slice(0, 16) })
    return { hit: false }
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    recordCloudCoachCacheEvent(userId, 'miss', { cache_key: cacheKey.slice(0, 16), reason: 'expired' })
    return { hit: false }
  }

  await sb
    .from('coach_query_cache')
    .update({
      hit_count: (data.hit_count ?? 0) + 1,
      last_hit_at: new Date().toISOString(),
    })
    .eq('id', data.id)

  recordCloudCoachCacheEvent(userId, 'hit', {
    cache_key: cacheKey.slice(0, 16),
    layer: 'cloud',
    hit_count: (data.hit_count ?? 0) + 1,
  })

  return { hit: true, response: data.response, key: cacheKey }
}

export async function saveCloudCachedCoachResponse(userId, message, { profile, goals = [] }, response) {
  const { getSupabase, isSupabaseConfigured } = await import('./supabaseClient.js')
  if (!isSupabaseConfigured || !userId) return

  const sb = getSupabase()
  const cacheKey = await hashKeyForCloud(message, profile, goals)
  const webSearchUsed = Boolean(response?.search_trace?.web_search_used)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + (webSearchUsed ? 24 : 168))

  await sb.from('coach_query_cache').upsert(
    {
      user_id: userId,
      cache_key: cacheKey,
      query_normalized: normalizeQuery(message),
      response,
      web_search_used: webSearchUsed,
      hit_count: 0,
      last_hit_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'user_id,cache_key' }
  )

  recordCloudCoachCacheEvent(userId, 'save', {
    cache_key: cacheKey.slice(0, 16),
    webSearchUsed,
    query: normalizeQuery(message).slice(0, 120),
  })
}

export function recordCloudCoachCacheEvent(userId, event, payload = {}) {
  if (!userId || userId === 'local') return

  import('./supabaseClient.js').then(({ getSupabase, isSupabaseConfigured }) => {
    if (!isSupabaseConfigured) return
    const sb = getSupabase()
    sb.from('coach_cache_events').insert({
      user_id: userId,
      event,
      cache_key: payload.cache_key ?? null,
      query_normalized: payload.query ?? null,
      payload,
    })
  })
}

export async function getCachedCoachResponse(message, { profile, goals = [] }) {
  const key = await hashKey(message, profile, goals)
  const db = await openDb()
  const entry = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })

  if (!entry) {
    recordEvent('miss', { key: key.slice(0, 16), query: normalizeQuery(message).slice(0, 80) })
    return { hit: false, key }
  }

  const ttl = entry.webSearchUsed ? WEB_TTL_MS : DEFAULT_TTL_MS
  if (Date.now() - entry.createdAt > ttl) {
    await deleteCachedEntry(key)
    recordEvent('miss', { key: key.slice(0, 16), reason: 'expired' })
    return { hit: false, key }
  }

  entry.hitCount = (entry.hitCount ?? 0) + 1
  entry.lastHitAt = Date.now()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  recordEvent('hit', { key: key.slice(0, 16), hitCount: entry.hitCount })
  return {
    hit: true,
    key,
    response: {
      ...entry.response,
      from_cache: true,
      search_trace: {
        ...(entry.response?.search_trace ?? {}),
        cache_hit: true,
        cache_layer: 'client',
      },
    },
  }
}

async function deleteCachedEntry(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveCachedCoachResponse(message, { profile, goals = [] }, response) {
  const key = await hashKey(message, profile, goals)
  const webSearchUsed = Boolean(response?.search_trace?.web_search_used)
  const db = await openDb()

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({
      key,
      queryNormalized: normalizeQuery(message),
      response,
      createdAt: Date.now(),
      lastHitAt: Date.now(),
      hitCount: 0,
      webSearchUsed,
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  await trimCache(db)
  recordEvent('save', { key: key.slice(0, 16), webSearchUsed })
  return { saved: true, key: key.slice(0, 16) }
}

async function trimCache(db) {
  const entries = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => reject(req.error)
  })
  if (entries.length <= MAX_ENTRIES) return

  entries.sort((a, b) => (a.lastHitAt ?? a.createdAt) - (b.lastHitAt ?? b.createdAt))
  const toRemove = entries.slice(0, entries.length - MAX_ENTRIES)
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    for (const e of toRemove) tx.objectStore(STORE).delete(e.key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
