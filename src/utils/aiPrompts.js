import { contractToPromptBlock } from './goalContract.js'

export function buildGuardianConstraints(contract) {
  return contractToPromptBlock(contract)
}

export function buildSystemContext(analysis, contract = null) {
  const { recovery, intensity, muscle, progression, stats } = analysis

  const goalBlock = contract ? contractToPromptBlock(contract) : ''

  return `You are IronCoach, an elite AI personal trainer inside the IronLog fitness app.
Your advice is monitored by Goal Guardian to keep you aligned with the user's fitness goals.
${goalBlock}

USER TRAINING DATA (last 30 days):
- Total sessions: ${stats.totalWorkouts}
- Total volume: ${stats.totalVolume.toLocaleString()} lbs
- Weekly sessions: ${recovery.weeklySessions}
- Recovery score: ${recovery.recoveryScore}/100
- Readiness: ${recovery.readiness}/100 (${recovery.readinessLabel})
- Fatigue: ${recovery.fatigue}/100 (${recovery.fatigueLabel})
- Recommended sleep: ${recovery.sleepRange.min}-${recovery.sleepRange.max} hours
- Intensity score: ${intensity.intensityScore}/100
- Workout quality: ${intensity.qualityScore}/100
- Consistency: ${intensity.consistencyScore}/100
- Muscle balance score: ${muscle.balanceScore}/100
- Push/pull ratio: ${muscle.pushPullRatio}
- Top progression insight: ${progression.d30.insights[0]?.message ?? 'No data yet'}

Respond as a knowledgeable, encouraging coach. Reference the user's actual data and goals when relevant. Keep responses concise (2-4 sentences) unless asked for detail. Use lbs for weights.`
}

export function buildChatPrompt(userMessage, analysis, contract = null) {
  return `${buildSystemContext(analysis, contract)}

USER QUESTION: ${userMessage}

Provide a personalized, actionable coaching response based on their training data and goal contract.`
}

export const SUGGESTED_QUESTIONS = [
  'How can I improve my bench?',
  'Am I training legs enough?',
  'How much protein should I eat?',
  'Should I deload next week?',
  'Am I recovering well?',
  'What should I train today?',
]
