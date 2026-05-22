import { getExerciseMeta } from '../data/exercises.js'
import { getLastNDaysVolume, getPersonalRecords, normalizeSessions } from './calculations.js'
import { flattenSets, getSessionVolume } from './session.js'
import { toDayKey } from './date.js'

export function getProgressiveOverloadSuggestions(sessions) {
  const normalized = normalizeSessions(sessions)
  const suggestions = []
  const byExercise = new Map()

  for (const session of [...normalized].sort((a, b) => new Date(b.date) - new Date(a.date))) {
    for (const block of session.exercises ?? []) {
      const key = block.exercise.toLowerCase()
      if (byExercise.has(key)) continue

      let best = 0
      let reps = 0
      for (const set of block.sets ?? []) {
        const w = Number(set.weight) || 0
        if (w >= best) {
          best = w
          reps = Number(set.reps) || 0
        }
      }
      if (best > 0) {
        byExercise.set(key, { exercise: block.exercise, weight: best, reps })
      }
    }
  }

  for (const [, data] of byExercise) {
    const increment = data.weight >= 200 ? 10 : data.weight >= 100 ? 5 : 2.5
    if (data.reps >= 8) {
      suggestions.push({
        type: 'overload',
        message: `Increase ${data.exercise} by ${increment} lbs next session`,
        exercise: data.exercise,
      })
    }
  }

  return suggestions.slice(0, 4)
}

export function getTrainingInsights(sessions) {
  const normalized = normalizeSessions(sessions)
  const insights = []

  const thisWeek = getLastNDaysVolume(normalized, 7)
  const lastWeekKeys = Object.keys(thisWeek)
  const thisWeekVol = Object.values(thisWeek).reduce((a, b) => a + b, 0)

  const muscleCounts = new Map()
  const recent = normalized.filter((s) => {
    const d = new Date(s.date)
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })

  for (const session of recent) {
    for (const block of session.exercises ?? []) {
      const meta = getExerciseMeta(block.exercise)
      const group = meta?.muscleGroup ?? 'Other'
      muscleCounts.set(group, (muscleCounts.get(group) ?? 0) + 1)
    }
  }

  for (const [group, count] of muscleCounts) {
    if (count >= 2) {
      insights.push({
        type: 'frequency',
        message: `You trained ${group.toLowerCase()} ${count} times this week`,
      })
    }
  }

  if (thisWeekVol > 0) {
    insights.push({
      type: 'volume',
      message: `${(thisWeekVol / 1000).toFixed(1)}k lbs moved in the last 7 days`,
    })
  }

  const prs = getPersonalRecords(normalized)
  if (prs.length > 0) {
    insights.push({
      type: 'pr',
      message: `Top PR: ${prs[0].exerciseDisplay} at ${prs[0].weight} lbs`,
    })
  }

  if (lastWeekKeys.length >= 2) {
    const keys = lastWeekKeys
    const firstHalf = keys.slice(0, Math.floor(keys.length / 2))
    const secondHalf = keys.slice(Math.floor(keys.length / 2))
    const volA = firstHalf.reduce((s, k) => s + thisWeek[k], 0)
    const volB = secondHalf.reduce((s, k) => s + thisWeek[k], 0)
    if (volA > 0) {
      const pct = Math.round(((volB - volA) / volA) * 100)
      if (Math.abs(pct) >= 5) {
        insights.push({
          type: 'trend',
          message:
            pct > 0
              ? `Training volume up ${pct}% in the second half of this week`
              : `Training volume down ${Math.abs(pct)}% in the second half of this week`,
        })
      }
    }
  }

  return insights.slice(0, 5)
}

export function getSessionSummary(session, allSessions) {
  const normalized = normalizeSessions(allSessions)
  const volume = getSessionVolume(session)
  const sets = flattenSets(session).length
  const exercises = session.exercises?.length ?? 0
  const prs = []

  const globalPrs = getPersonalRecords(normalized.filter((s) => s.id !== session.id))

  for (const block of session.exercises ?? []) {
    let best = 0
    for (const set of block.sets ?? []) {
      best = Math.max(best, Number(set.weight) || 0)
    }
    if (best <= 0) continue
    const key = block.exercise.toLowerCase()
    const prev = globalPrs.find((p) => p.exerciseDisplay.toLowerCase() === key)
    if (!prev || best > prev.weight) {
      prs.push({ exercise: block.exercise, weight: best })
    }
  }

  return { volume, sets, exercises, prs, duration: session.duration ?? 0 }
}

export function getBodyweightTrend(entries) {
  if (!entries.length) return { trend: 'neutral', change: 0 }
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
  const recent = sorted.slice(-7)
  const older = sorted.slice(-14, -7)
  if (recent.length < 2 || older.length < 2) return { trend: 'neutral', change: 0 }

  const avgRecent = recent.reduce((s, e) => s + e.weight, 0) / recent.length
  const avgOlder = older.reduce((s, e) => s + e.weight, 0) / older.length
  const change = avgRecent - avgOlder

  return {
    trend: change > 0.5 ? 'bulk' : change < -0.5 ? 'cut' : 'neutral',
    change: Math.round(change * 10) / 10,
  }
}

export function getCalendarDayIntensity(sessions, dayKey) {
  const daySessions = sessions.filter((s) => toDayKey(s.date) === dayKey)
  if (!daySessions.length) return 0
  const vol = daySessions.reduce((s, sess) => s + getSessionVolume(sess), 0)
  if (vol > 15000) return 3
  if (vol > 8000) return 2
  return 1
}
