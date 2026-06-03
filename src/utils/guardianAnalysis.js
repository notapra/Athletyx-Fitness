/**
 * Goal Guardian drift scorer — lightweight heuristic judge (0–100).
 *
 * Why heuristics first:
 * - Zero marginal cost per message, works offline, easy to unit test.
 * - Explainable reasons[] for UI and future guardian_checks audit table.
 *
 * Upgrade path: LLM-as-judge on high-stakes replies only, or train a small classifier.
 */

import { analyzeMuscleBalance } from './muscleBalance.js'

const OFF_TOPIC_PATTERNS = [
  'politics', 'election', 'weather forecast', 'movie', 'netflix', 'video game',
  'travel itinerary', 'relationship advice', 'stock market', 'bitcoin', 'homework',
  'write an essay', 'programming', 'javascript', 'python code',
]

export function classifyUserMessage(message, contract) {
  const lower = String(message ?? '').toLowerCase()
  const isOffTopic = contract.offTopicKeywords.some((w) => lower.includes(w)) ||
    OFF_TOPIC_PATTERNS.some((p) => lower.includes(p))

  const isTraining = contract.keywords.some((w) => lower.includes(w)) ||
    ['?', 'how', 'should', 'workout', 'train', 'lift', 'eat', 'protein'].some((w) =>
      lower.includes(w)
    )

  return { isOffTopic, isTraining }
}

function countGoalKeywords(text, contract) {
  const lower = String(text ?? '').toLowerCase()
  let hits = 0
  for (const kw of contract.keywords) {
    if (lower.includes(kw)) hits++
  }
  return hits
}

function detectGoalContradiction(reply, contract) {
  const lower = reply.toLowerCase()
  const goal = contract.primaryGoal.toLowerCase()

  if (
    (goal.includes('cut') || goal.includes('lose fat') || goal.includes('weight loss')) &&
    (lower.includes('eat everything') || lower.includes('massive surplus') || lower.includes('dirty bulk'))
  ) {
    return 25
  }

  if (
    (goal.includes('bulk') || goal.includes('muscle') || goal.includes('hypertrophy')) &&
    lower.includes('avoid all carbs') &&
    !lower.includes('unless')
  ) {
    return 20
  }

  if (goal.includes('leg') && lower.includes('skip leg') && !lower.includes("don't skip")) {
    return 30
  }

  return 0
}

function detectMuscleMismatch(sessions, contract) {
  const goal = contract.primaryGoal.toLowerCase()
  if (!sessions?.length) return 0

  const muscle = analyzeMuscleBalance(sessions, 14)
  if (muscle.totalVolume === 0) return 0

  if (goal.includes('leg')) {
    const legPct = Math.round((muscle.movementVolume.legs / muscle.totalVolume) * 100)
    if (legPct < 20) return 20
  }

  if (goal.includes('pull') || goal.includes('back')) {
    const pullPct = muscle.movementVolume.pull
    const pushPct = muscle.movementVolume.push
    if (pushPct > pullPct * 1.5) return 15
  }

  return 0
}

/**
 * Aggregates drift signals into score + level (aligned | moderate | high).
 * Used by guardianService.reviewCoachReply for post-hoc guardrails.
 */
export function scoreDrift({ reply, userMessage, contract, chatHistory = [], sessions = [] }) {
  if (!contract || !reply) {
    return { score: 0, level: 'aligned', reasons: [] }
  }

  const reasons = []
  let score = 0

  const userClass = classifyUserMessage(userMessage, contract)
  const replyKeywords = countGoalKeywords(reply, contract)

  if (userClass.isOffTopic && replyKeywords < 2) {
    score += 35
    reasons.push('Off-topic question without goal redirect')
  }

  if (userClass.isOffTopic && !reply.toLowerCase().includes('goal') && !reply.toLowerCase().includes('training')) {
    score += 25
    reasons.push('Coach answered off-topic without redirecting')
  }

  const contradiction = detectGoalContradiction(reply, contract)
  if (contradiction > 0) {
    score += contradiction
    reasons.push('Advice may contradict primary goal')
  }

  const muscleMismatch = detectMuscleMismatch(sessions, contract)
  if (muscleMismatch > 0) {
    score += muscleMismatch
    reasons.push('Recent training volume misaligned with stated goal')
  }

  if (reply.length > 400 && replyKeywords < 2 && userClass.isTraining) {
    score += 15
    reasons.push('Long reply without referencing user goals')
  }

  const recentAssistant = (chatHistory ?? [])
    .filter((m) => m.role === 'assistant')
    .slice(-3)
  const driftStreak = recentAssistant.filter(
    (m) => countGoalKeywords(m.content ?? m.message ?? '', contract) < 1
  ).length

  if (driftStreak >= 2 && replyKeywords < 2) {
    score += 20
    reasons.push('Multiple recent replies lacked goal alignment')
  }

  score = Math.min(100, score)

  let level = 'aligned'
  if (score >= 60) level = 'high'
  else if (score >= 30) level = 'moderate'

  return { score, level, reasons, driftStreak }
}

export function buildGoalFocusedCorrection(contract, reasons) {
  const topGoal = contract.primaryGoal
  const sub = contract.activeGoals[0]
  const subText = sub ? ` Your active target "${sub.title}" should stay the priority.` : ''

  return `\n\n— **Goal Guardian:** This drifted from your focus (${topGoal}).${subText} ${reasons[0] ?? 'Staying aligned with your goals.'} Ask me to refocus on your goals for a tighter answer.`
}

export function buildAlignmentSummary(contract, sessions, analysis) {
  const muscle = analysis?.muscle ?? analyzeMuscleBalance(sessions, 14)
  const stats = analysis?.stats
  const aligned = contract.hasDefinedGoals

  let message = aligned
    ? `Staying focused on: ${contract.primaryGoal}`
    : 'Set a primary fitness goal in Profile for tighter coaching.'

  if (contract.activeGoals.length > 0) {
    message += `. Next target: ${contract.activeGoals[0].title}`
  }

  if (stats?.totalWorkouts > 0 && muscle.balanceScore < 60) {
    message += '. Training balance could better match your goal — check muscle distribution.'
  }

  return message
}
