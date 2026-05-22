import {
  scoreDrift,
  buildGoalFocusedCorrection,
  buildAlignmentSummary,
} from '../utils/guardianAnalysis.js'
import { buildGoalContract } from '../utils/goalContract.js'
import {
  triggerPostWorkoutReminder,
  tickReminders,
  dismissReminder,
} from '../utils/reminderScheduler.js'
import { getSessionVolume } from '../utils/session.js'

const DRIFT_STORAGE_KEY = 'gymtracker_drift_warnings'

function loadDriftCount() {
  try {
    return Number(sessionStorage.getItem(DRIFT_STORAGE_KEY) ?? 0)
  } catch {
    return 0
  }
}

function saveDriftCount(n) {
  try {
    sessionStorage.setItem(DRIFT_STORAGE_KEY, String(n))
  } catch {
    /* ignore */
  }
}

export function incrementDriftWarningCount() {
  const n = loadDriftCount() + 1
  saveDriftCount(n)
  return n
}

export function getDriftWarningCount() {
  return loadDriftCount()
}

export function resetDriftWarningCount() {
  saveDriftCount(0)
}

export function logGuardianCheck() {
  /* local-only: checks stay in memory / session */
}

export function logGuardianReminder() {
  /* local-only: reminder state in reminderScheduler */
}

export function reviewCoachReply({ reply, userMessage, contract, chatHistory, sessions, userId }) {
  const result = scoreDrift({
    reply,
    userMessage,
    contract,
    chatHistory,
    sessions,
  })

  let finalReply = reply
  let guardianNote = null
  let warningLevel = null

  if (result.level === 'high') {
    finalReply = reply + buildGoalFocusedCorrection(contract, result.reasons)
    guardianNote = result.reasons.join('. ')
    warningLevel = 'high'
    incrementDriftWarningCount()
  } else if (result.level === 'moderate') {
    guardianNote =
      'Goal Guardian: this may drift from your goal — tap "Refocus on my goals" for a tighter answer.'
    warningLevel = 'moderate'
    incrementDriftWarningCount()
  }

  if (userId) {
    logGuardianCheck(userId, {
      checkType: 'post_response',
      driftScore: result.score,
      aligned: result.level === 'aligned',
      coachExcerpt: reply.slice(0, 200),
      payload: { reasons: result.reasons },
    })
  }

  return {
    content: finalReply,
    driftScore: result.score,
    level: result.level,
    reasons: result.reasons,
    guardianNote,
    warningLevel,
  }
}

export function buildRefocusedReply(contract, analysis) {
  const sub = contract.activeGoals[0]
  const subLine = sub ? ` Target: ${sub.title}${sub.target ? ` (${sub.target})` : ''}.` : ''
  return `Refocusing on your goal: "${contract.primaryGoal}".${subLine} Based on your data — readiness and volume are logged. What specific lift or session do you want to plan next?`
}

export function getGuardianStatus(contract, sessions, analysis) {
  const alignmentScore = contract.hasDefinedGoals
    ? Math.min(100, 70 + (contract.activeGoals.length > 0 ? 15 : 0) + (sessions.length > 0 ? 15 : 0))
    : 40

  return {
    alignmentScore,
    summary: buildAlignmentSummary(contract, sessions, analysis),
    hasGoals: contract.hasDefinedGoals,
    driftWarnings: getDriftWarningCount(),
  }
}

export function maybePostWorkoutReminder({ userId, profile, contract, session, workoutMode }) {
  const vol = getSessionVolume(session)
  const reminder = triggerPostWorkoutReminder({
    userId,
    profile,
    contract,
    workoutMode,
  })

  if (reminder && userId) {
    logGuardianReminder(userId, { reminderType: 'post_workout', message: reminder.message })
  }

  let sessionNote = null
  if (contract.hasDefinedGoals && vol > 0) {
    const goalLower = contract.primaryGoal.toLowerCase()
    if (goalLower.includes('leg') && session.split === 'Push') {
      sessionNote = 'Guardian note: Push-focused session — ensure leg work soon to match your leg goal.'
    }
  }

  return { reminder, sessionNote }
}

export function runReminderTick({ userId, profile, goals, sessions, workoutMode, analysis }) {
  const contract = buildGoalContract(profile, goals, sessions)
  const reminder = tickReminders({
    userId,
    profile,
    contract,
    sessions,
    workoutMode,
    driftWarningCount: getDriftWarningCount(),
  })

  if (reminder && userId) {
    logGuardianReminder(userId, { reminderType: reminder.type, message: reminder.message })
  }

  return { contract, reminder, status: getGuardianStatus(contract, sessions, analysis) }
}

export { dismissReminder, buildGoalContract }
