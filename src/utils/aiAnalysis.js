/**
 * Feature store for coaching — deterministic analytics fed into prompts (not an LLM).
 *
 * Think of runFullAnalysis() as building a structured "user state" object:
 * recovery, intensity, muscle balance, progression windows — similar to tool outputs
 * an agent would fetch before answering, but computed locally from workout logs.
 */

import { getDashboardStats, getPersonalRecords } from './calculations.js'
import { getProgressionSummary } from './progressionAnalysis.js'
import { analyzeRecovery } from './recoveryAnalysis.js'
import { analyzeIntensity } from './intensityAnalysis.js'
import { analyzeMuscleBalance } from './muscleBalance.js'
import { filterSessionsByDays } from './aiHelpers.js'

/** Single entry point for all coach/guardian features — cache result per session list in UI hooks. */
export function runFullAnalysis(sessions) {
  const stats = getDashboardStats(sessions)
  const prs = getPersonalRecords(sessions)
  const recovery = analyzeRecovery(sessions)
  const intensity = analyzeIntensity(sessions, 30)
  const intensity7 = analyzeIntensity(sessions, 7)
  const muscle = analyzeMuscleBalance(sessions, 14)
  const muscle30 = analyzeMuscleBalance(sessions, 30)
  const progression = getProgressionSummary(sessions)

  const windows = {
    d7: {
      sessions: filterSessionsByDays(sessions, 7).length,
      progression: progression.d7,
    },
    d14: {
      sessions: filterSessionsByDays(sessions, 14).length,
      progression: progression.d14,
    },
    d30: {
      sessions: filterSessionsByDays(sessions, 30).length,
      progression: progression.d30,
    },
  }

  return {
    stats,
    prs,
    recovery,
    intensity,
    intensity7,
    muscle,
    muscle30,
    progression,
    windows,
    generatedAt: new Date().toISOString(),
  }
}

export function getCoachHeadline(analysis) {
  const { recovery, intensity, stats } = analysis

  if (stats.totalWorkouts === 0) {
    return {
      title: 'Your AI coach is ready',
      subtitle: 'Complete your first workout to unlock personalized coaching.',
    }
  }

  if (recovery.readiness >= 80) {
    return {
      title: 'You are primed to perform',
      subtitle: `Readiness at ${recovery.readiness}% — attack today's session with confidence.`,
    }
  }

  if (recovery.fatigue >= 65) {
    return {
      title: 'Recovery should be the priority',
      subtitle: `Fatigue is ${recovery.fatigueLabel.toLowerCase()}. Consider lighter work or extra rest.`,
    }
  }

  if (intensity.consistencyScore < 50) {
    return {
      title: 'Consistency is your edge',
      subtitle: 'Training more regularly will unlock faster strength gains.',
    }
  }

  return {
    title: 'Training on track',
    subtitle: `Recovery ${recovery.recoveryScore}% · Quality ${intensity.qualityScore}% · Keep building.`,
  }
}
