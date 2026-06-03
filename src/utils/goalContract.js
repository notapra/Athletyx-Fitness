/**
 * Goal Contract — structured user intent for prompts and drift detection.
 *
 * Single source of truth built from profile.fitness_goal + active goals + constraints.
 * Keywords power both:
 * - Prompt injection (what the coach must respect)
 * - Guardian classifyUserMessage / countGoalKeywords (offline alignment checks)
 */

const TRAINING_KEYWORDS = [
  'workout', 'train', 'lift', 'gym', 'exercise', 'set', 'rep', 'weight', 'bench',
  'squat', 'deadlift', 'press', 'pull', 'push', 'leg', 'muscle', 'hypertrophy',
  'strength', 'volume', 'recovery', 'deload', 'protein', 'nutrition', 'pr', 'cardio',
  'rest', 'sleep', 'fatigue', 'progress', 'overload', 'split', 'session',
]

const OFF_TOPIC_KEYWORDS = [
  'politics', 'election', 'weather', 'movie', 'game', 'travel', 'vacation',
  'relationship', 'dating', 'stock', 'crypto', 'homework', 'essay', 'code',
  'programming', 'recipe', 'cooking', 'celebrity', 'news',
]

export const DEFAULT_GUARDIAN_PREFS = {
  guardian_enabled: true,
  weekly_review_day: 0,
  quiet_hours: { start: 22, end: 7 },
  daily_checkin: false,
}

export function parseGuardianPrefs(notificationPreferences) {
  const raw = notificationPreferences ?? {}
  return {
    ...DEFAULT_GUARDIAN_PREFS,
    ...raw,
    quiet_hours: { ...DEFAULT_GUARDIAN_PREFS.quiet_hours, ...raw.quiet_hours },
  }
}

/** Normalize profile + goals into a contract object consumed by prompts and Guardian. */
export function buildGoalContract(profile, goals = [], sessions = []) {
  const activeGoals = (goals ?? []).filter((g) => !g.completed)
  const primaryGoal = String(profile?.fitness_goal ?? '').trim()
  const aiPrefs = profile?.ai_preferences ?? {}
  const constraints = Array.isArray(aiPrefs.constraints) ? aiPrefs.constraints : []
  const weeklyTarget = aiPrefs.weekly_session_target ?? null

  const keywords = new Set(TRAINING_KEYWORDS)

  if (primaryGoal) {
    primaryGoal.toLowerCase().split(/\s+/).forEach((w) => {
      if (w.length > 2) keywords.add(w)
    })
  }

  for (const g of activeGoals) {
    const text = `${g.title ?? ''} ${g.target ?? ''}`.toLowerCase()
    text.split(/\s+/).forEach((w) => {
      if (w.length > 2) keywords.add(w)
    })
  }

  if (primaryGoal.toLowerCase().includes('leg')) {
    keywords.add('squat')
    keywords.add('deadlift')
    keywords.add('hamstring')
    keywords.add('quad')
  }
  if (primaryGoal.toLowerCase().includes('bench') || primaryGoal.toLowerCase().includes('press')) {
    keywords.add('bench')
    keywords.add('press')
    keywords.add('chest')
  }
  if (primaryGoal.toLowerCase().includes('cut') || primaryGoal.toLowerCase().includes('lose')) {
    keywords.add('deficit')
    keywords.add('cardio')
  }
  if (primaryGoal.toLowerCase().includes('bulk') || primaryGoal.toLowerCase().includes('muscle')) {
    keywords.add('hypertrophy')
    keywords.add('volume')
    keywords.add('protein')
  }

  const lastSessionDate = sessions[0]?.date ?? null

  return {
    primaryGoal: primaryGoal || 'General strength and consistency',
    experienceLevel: profile?.experience_level ?? 'intermediate',
    activeGoals: activeGoals.map((g) => ({
      title: g.title,
      target: g.target,
    })),
    constraints,
    weeklySessionTarget: weeklyTarget,
    keywords: [...keywords],
    offTopicKeywords: OFF_TOPIC_KEYWORDS,
    hasDefinedGoals: Boolean(primaryGoal || activeGoals.length > 0),
    lastSessionDate,
  }
}

export function contractToPromptBlock(contract) {
  if (!contract) return ''

  const goalsList =
    contract.activeGoals.length > 0
      ? contract.activeGoals
          .map((g) => `- ${g.title}${g.target ? ` (target: ${g.target})` : ''}`)
          .join('\n')
      : '- None set yet — encourage user to define specific targets'

  const constraintsList =
    contract.constraints.length > 0
      ? contract.constraints.map((c) => `- ${c}`).join('\n')
      : '- None specified'

  return `
GOAL CONTRACT (monitored by Goal Guardian — non-negotiable):
- Primary fitness goal: ${contract.primaryGoal}
- Experience level: ${contract.experienceLevel}
- Active sub-goals:
${goalsList}
- User constraints:
${constraintsList}
${contract.weeklySessionTarget ? `- Weekly session target: ${contract.weeklySessionTarget}` : ''}

COACHING RULES:
- Every response must connect to the primary goal or an active sub-goal when possible.
- Politely decline off-topic requests (politics, entertainment, unrelated life advice) and redirect to training.
- Do not contradict the primary goal (e.g. do not push aggressive bulking if goal is cutting).
- Stay concise and actionable.`
}
