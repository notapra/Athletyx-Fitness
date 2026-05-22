import { normalizeSessions } from './calculations.js'
import { flattenSets, getSessionVolume } from './session.js'
import { toDayKey } from './date.js'

export function filterSessionsByDays(sessions, days) {
  const normalized = normalizeSessions(sessions)
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return normalized.filter((s) => new Date(s.date).getTime() >= cutoff)
}

export function getSetsInWindow(sessions, days) {
  return filterSessionsByDays(sessions, days).flatMap(flattenSets)
}

export function getDailyLoads(sessions, days) {
  const filtered = filterSessionsByDays(sessions, days)
  const loads = new Map()

  for (const session of filtered) {
    const key = toDayKey(session.date)
    const vol = getSessionVolume(session)
    const setCount = flattenSets(session).length
    const load = vol + setCount * 50
    loads.set(key, (loads.get(key) ?? 0) + load)
  }

  return loads
}

export function getConsecutiveTrainingDays(sessions) {
  const keys = new Set(
    normalizeSessions(sessions).map((s) => toDayKey(s.date))
  )
  let count = 0
  let cursor = stripTime(new Date())

  if (!keys.has(toDayKey(cursor))) {
    cursor = addDays(cursor, -1)
  }

  while (keys.has(toDayKey(cursor))) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export function getTrainingDaysInWindow(sessions, days) {
  const keys = new Set()
  for (const s of filterSessionsByDays(sessions, days)) {
    keys.add(toDayKey(s.date))
  }
  return keys.size
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeExercise(name) {
  return String(name ?? '').trim().toLowerCase()
}

function stripTime(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return stripTime(x)
}
