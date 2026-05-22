import { getExerciseMeta } from '../data/exercises.js'
import { filterSessionsByDays, normalizeExercise, clamp } from './aiHelpers.js'
function getExerciseHistory(sessions, exerciseName) {
  const target = normalizeExercise(exerciseName)
  const points = []

  for (const session of sessions) {
    let bestWeight = 0
    let bestReps = 0
    let totalVolume = 0
    let setCount = 0

    for (const block of session.exercises ?? []) {
      if (normalizeExercise(block.exercise) !== target) continue
      for (const set of block.sets ?? []) {
        const w = Number(set.weight) || 0
        const r = Number(set.reps) || 0
        if (w <= 0 || r <= 0) continue
        setCount++
        totalVolume += w * r
        if (w > bestWeight || (w === bestWeight && r > bestReps)) {
          bestWeight = w
          bestReps = r
        }
      }
    }

    if (bestWeight > 0) {
      points.push({
        date: session.date,
        weight: bestWeight,
        reps: bestReps,
        volume: totalVolume,
        sets: setCount,
      })
    }
  }

  return points.sort((a, b) => new Date(a.date) - new Date(b.date))
}

function getTrackedExercises(sessions) {
  const names = new Map()
  for (const session of sessions) {
    for (const block of session.exercises ?? []) {
      const name = String(block.exercise ?? '').trim()
      if (!name) continue
      const key = normalizeExercise(name)
      if (!names.has(key)) names.set(key, name)
    }
  }
  return [...names.values()]
}

function suggestIncrement(weight) {
  if (weight >= 200) return 10
  if (weight >= 100) return 5
  if (weight >= 50) return 2.5
  return 2.5
}

export function analyzeProgression(sessions, days = 30) {
  const windowSessions = filterSessionsByDays(sessions, days)
  const insights = []
  const exercises = getTrackedExercises(windowSessions)

  for (const exercise of exercises) {
    const history = getExerciseHistory(windowSessions, exercise)
    if (history.length < 2) continue

    const recent = history.slice(-4)
    const latest = recent[recent.length - 1]
    const meta = getExerciseMeta(exercise)
    const splitHint = meta?.movementType === 'legs' ? 'legs' : meta?.movementType === 'pull' ? 'pull' : 'push'

    const highRepSessions = recent.filter((p) => p.reps >= 8 && p.weight === latest.weight)
    if (highRepSessions.length >= 2 && latest.reps >= 8) {
      const inc = suggestIncrement(latest.weight)
      insights.push({
        type: 'overload',
        severity: 'positive',
        exercise,
        message: `You successfully hit ${latest.weight} lbs for ${latest.reps} reps multiple times recently. Increase to ${latest.weight + inc} lbs on your next ${splitHint} session.`,
        action: `Add ${inc} lbs`,
      })
    }

    const weights = recent.map((p) => p.weight)
    const uniqueWeights = new Set(weights)
    if (recent.length >= 3 && uniqueWeights.size === 1) {
      insights.push({
        type: 'plateau',
        severity: 'warning',
        exercise,
        message: `Your ${exercise} has stalled at ${latest.weight} lbs for ${recent.length} sessions. Consider increasing recovery, adjusting rep ranges, or a strategic deload.`,
        action: 'Break plateau',
      })
    }

    if (recent.length >= 3) {
      const firstVol = recent[0].volume
      const lastVol = recent[recent.length - 1].volume
      if (firstVol > 0) {
        const change = ((lastVol - firstVol) / firstVol) * 100
        if (change >= 10) {
          insights.push({
            type: 'trend',
            severity: 'positive',
            exercise,
            message: `${exercise} volume is trending upward (+${Math.round(change)}%) — progressive overload is on track.`,
            action: 'Keep going',
          })
        } else if (change <= -15) {
          insights.push({
            type: 'trend',
            severity: 'warning',
            exercise,
            message: `${exercise} volume dropped ${Math.abs(Math.round(change))}% recently. You may be fatigued or under-recovered.`,
            action: 'Monitor fatigue',
          })
        }
      }
    }

    if (recent.length >= 2) {
      const wTrend = recent[recent.length - 1].weight - recent[0].weight
      if (wTrend > 0 && latest.reps >= 5) {
        insights.push({
          type: 'intensity',
          severity: 'positive',
          exercise,
          message: `${exercise} intensity is trending upward appropriately (+${wTrend} lbs over recent sessions).`,
          action: 'Maintain progression',
        })
      }
    }
  }

  const score = clamp(
    50 +
      insights.filter((i) => i.severity === 'positive').length * 8 -
      insights.filter((i) => i.severity === 'warning').length * 10,
    0,
    100
  )

  return {
    insights: insights.slice(0, 8),
    score,
    exercisesTracked: exercises.length,
  }
}

export function getProgressionSummary(sessions) {
  return {
    d7: analyzeProgression(sessions, 7),
    d14: analyzeProgression(sessions, 14),
    d30: analyzeProgression(sessions, 30),
  }
}
