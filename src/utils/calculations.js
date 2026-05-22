import { toDayKey } from './date.js'
import { flattenSets, getSessionVolume, migrateLegacyWorkout } from './session.js'
import { getExerciseMeta } from '../data/exercises.js'

export function normalizeSessions(workouts) {
  return workouts.map(migrateLegacyWorkout)
}

export function computeSetVolume(weight, reps) {
  return (Number(weight) || 0) * (Number(reps) || 0)
}

export function computeWorkoutVolume(weight, reps, sets) {
  return computeSetVolume(weight, reps) * (Number(sets) || 0)
}

export function getAllSets(sessions) {
  const normalized = normalizeSessions(sessions)
  return normalized.flatMap(flattenSets)
}

export function getPersonalRecords(sessions) {
  const map = new Map()

  for (const row of getAllSets(sessions)) {
    const key = normalizeExercise(row.exercise)
    if (!key) continue
    const cw = Number(row.weight)
    if (Number.isNaN(cw) || cw <= 0) continue

    const prev = map.get(key)
    if (!prev || cw > prev.weight) {
      map.set(key, { exerciseDisplay: trimExercise(row.exercise), weight: cw, date: row.date })
    }
  }

  return [...map.values()].sort((a, b) => b.weight - a.weight)
}

export function getDashboardStats(sessions) {
  const normalized = normalizeSessions(sessions)
  let totalSets = 0
  let totalVolume = 0
  const exerciseCounts = new Map()

  for (const session of normalized) {
    const rows = flattenSets(session)
    totalSets += rows.length
    totalVolume += getSessionVolume(session)

    for (const row of rows) {
      const key = normalizeExercise(row.exercise)
      if (!key) continue
      exerciseCounts.set(key, (exerciseCounts.get(key) ?? 0) + 1)
    }
  }

  let mostTrained = null
  let mostCount = 0
  for (const [key, count] of exerciseCounts) {
    if (count > mostCount) {
      mostCount = count
      mostTrained = key
    }
  }

  return {
    totalWorkouts: normalized.length,
    totalSets,
    totalVolume,
    mostTrainedExercise: mostTrained ? titleCasePreserve(mostTrained) : '—',
  }
}

export function getLastNDaysVolume(sessions, days = 7) {
  const normalized = normalizeSessions(sessions)
  const volumes = {}
  const anchor = stripTimeLocal(new Date())

  for (let i = days - 1; i >= 0; i--) {
    const slot = stripTimeLocal(new Date(anchor))
    slot.setDate(anchor.getDate() - i)
    volumes[toDayKey(slot)] = 0
  }

  for (const session of normalized) {
    const key = toDayKey(session.date)
    if (key in volumes) {
      volumes[key] += getSessionVolume(session)
    }
  }

  return volumes
}

export function getExerciseProgression(sessions, exerciseName, limit = 12) {
  const target = normalizeExercise(exerciseName)
  const normalized = normalizeSessions(sessions)
  const points = []

  for (const session of normalized) {
    let best = 0
    for (const block of session.exercises ?? []) {
      if (normalizeExercise(block.exercise) !== target) continue
      for (const set of block.sets ?? []) {
        best = Math.max(best, Number(set.weight) || 0)
      }
    }
    if (best > 0) {
      points.push({ date: session.date, weight: best, volume: getSessionVolume(session) })
    }
  }

  return points
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-limit)
}

export function getVolumeOverTime(sessions, days = 30) {
  const normalized = normalizeSessions(sessions)
  const map = new Map()
  const anchor = stripTimeLocal(new Date())

  for (let i = days - 1; i >= 0; i--) {
    const slot = stripTimeLocal(new Date(anchor))
    slot.setDate(anchor.getDate() - i)
    map.set(toDayKey(slot), 0)
  }

  for (const session of normalized) {
    const key = toDayKey(session.date)
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + getSessionVolume(session))
    }
  }

  return [...map.entries()].map(([date, volume]) => ({
    date,
    label: formatChartDay(date),
    volume,
  }))
}

export function getWorkoutFrequency(sessions, weeks = 8) {
  const normalized = normalizeSessions(sessions)
  const buckets = new Map()

  for (const session of normalized) {
    const d = new Date(session.date)
    if (Number.isNaN(d.getTime())) continue
    const weekStart = getWeekStart(d)
    const key = toDayKey(weekStart)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  const result = []
  const now = stripTimeLocal(new Date())
  for (let i = weeks - 1; i >= 0; i--) {
    const slot = stripTimeLocal(new Date(now))
    slot.setDate(now.getDate() - i * 7)
    const key = toDayKey(getWeekStart(slot))
    result.push({
      week: `W${weeks - i}`,
      count: buckets.get(key) ?? 0,
    })
  }

  return result
}

export function getMuscleGroupDistribution(sessions) {
  const normalized = normalizeSessions(sessions)
  const counts = new Map()

  for (const session of normalized) {
    for (const block of session.exercises ?? []) {
      const meta = getExerciseMeta(block.exercise)
      const group = meta?.muscleGroup ?? 'Other'
      const setCount = (block.sets ?? []).length
      counts.set(group, (counts.get(group) ?? 0) + setCount)
    }
  }

  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function getSessionsByDay(sessions) {
  const normalized = normalizeSessions(sessions)
  const map = new Map()

  for (const session of normalized) {
    const key = toDayKey(session.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(session)
  }

  return map
}

export function getWeeklyVolume(sessions) {
  const vol = getLastNDaysVolume(sessions, 7)
  return Object.values(vol).reduce((a, b) => a + b, 0)
}

export function getSessionPRs(session, allSessions) {
  const prs = []
  const existing = getPersonalRecords(allSessions.filter((s) => s.id !== session.id))

  for (const block of session.exercises ?? []) {
    let best = 0
    for (const set of block.sets ?? []) {
      best = Math.max(best, Number(set.weight) || 0)
    }
    if (best <= 0) continue

    const key = normalizeExercise(block.exercise)
    const prev = existing.find((p) => normalizeExercise(p.exerciseDisplay) === key)
    if (!prev || best > prev.weight) {
      prs.push({ exercise: block.exercise, weight: best })
    }
  }

  return prs
}

function getWeekStart(d) {
  const x = stripTimeLocal(new Date(d))
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

function formatChartDay(key) {
  const d = new Date(`${key}T12:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function stripTimeLocal(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function normalizeExercise(name) {
  return trimExercise(name).toLowerCase()
}

function trimExercise(name) {
  return String(name ?? '').trim()
}

function titleCasePreserve(key) {
  return key.replace(/\b\w/g, (c) => c.toUpperCase())
}
