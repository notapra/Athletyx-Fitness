import { filterSessionsByDays, clamp } from './aiHelpers.js'
import { flattenSets } from './session.js'

function estimateSetIntensity(reps, weight) {
  if (reps <= 0 || weight <= 0) return 0
  if (reps <= 5) return 90
  if (reps <= 8) return 80
  if (reps <= 12) return 72
  if (reps <= 15) return 60
  return 50
}

export function analyzeIntensity(sessions, days = 30) {
  const windowSessions = filterSessionsByDays(sessions, days)
  const allSets = windowSessions.flatMap(flattenSets)

  if (allSets.length === 0) {
    return {
      intensityScore: 0,
      qualityScore: 0,
      consistencyScore: 0,
      hypertrophyPct: 0,
      insights: [
        {
          type: 'empty',
          message: 'Log workouts to unlock intensity analysis and personalized coaching.',
        },
      ],
    }
  }

  let hypertrophySets = 0
  let strengthSets = 0
  let lowIntensitySets = 0
  let totalIntensity = 0

  for (const set of allSets) {
    const reps = Number(set.reps) || 0
    const weight = Number(set.weight) || 0
    if (reps <= 0 || weight <= 0) continue

    const intensity = estimateSetIntensity(reps, weight)
    totalIntensity += intensity

    if (reps >= 6 && reps <= 12) hypertrophySets++
    else if (reps <= 5) strengthSets++
    else lowIntensitySets++
  }

  const workingSets = hypertrophySets + strengthSets + lowIntensitySets
  const hypertrophyPct = workingSets > 0 ? Math.round((hypertrophySets / workingSets) * 100) : 0
  const avgIntensity = workingSets > 0 ? totalIntensity / workingSets : 0

  const sessionDates = new Set(windowSessions.map((s) => new Date(s.date).toDateString()))
  const weeks = Math.max(1, days / 7)
  const sessionsPerWeek = sessionDates.size / weeks

  const intensityScore = clamp(Math.round(avgIntensity), 0, 100)
  const qualityScore = clamp(
    Math.round(hypertrophyPct * 0.5 + avgIntensity * 0.35 + Math.min(sessionsPerWeek, 5) * 6),
    0,
    100
  )
  const consistencyScore = clamp(
    Math.round(Math.min(sessionsPerWeek / 4, 1) * 70 + (windowSessions.length >= 4 ? 30 : windowSessions.length * 7)),
    0,
    100
  )

  const insights = []

  if (hypertrophyPct < 40 && workingSets >= 10) {
    insights.push({
      type: 'hypertrophy',
      severity: 'warning',
      message:
        'Most working sets appear below optimal hypertrophy intensity (6–12 rep range). Consider adding more moderate-rep work.',
    })
  } else if (hypertrophyPct >= 55) {
    insights.push({
      type: 'hypertrophy',
      severity: 'positive',
      message: 'Your rep ranges align well with hypertrophy training — strong session structure.',
    })
  }

  if (avgIntensity >= 75 && windowSessions.length >= 3) {
    insights.push({
      type: 'effort',
      severity: 'positive',
      message: 'Your recent sessions show strong progressive overload and appropriate training effort.',
    })
  } else if (avgIntensity < 60 && workingSets >= 15) {
    insights.push({
      type: 'effort',
      severity: 'caution',
      message: 'Training effort appears inconsistent. Push closer to failure on key working sets.',
    })
  }

  if (sessionsPerWeek < 2 && days >= 14) {
    insights.push({
      type: 'frequency',
      severity: 'warning',
      message: `Training frequency is low (~${sessionsPerWeek.toFixed(1)} sessions/week). Consistency drives long-term results.`,
    })
  } else if (sessionsPerWeek >= 3.5) {
    insights.push({
      type: 'frequency',
      severity: 'positive',
      message: `Solid training frequency at ~${sessionsPerWeek.toFixed(1)} sessions per week.`,
    })
  }

  if (strengthSets > hypertrophySets * 1.5) {
    insights.push({
      type: 'balance',
      message: 'Program skews toward heavy low-rep work. Balance with moderate-rep volume for muscle growth.',
    })
  }

  return {
    intensityScore,
    qualityScore,
    consistencyScore,
    hypertrophyPct,
    avgIntensity: Math.round(avgIntensity),
    sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
    insights,
  }
}
