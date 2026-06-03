/**
 * Proactive alignment reminders — rate-limited "agent nudges" (not LLM-generated).
 *
 * Caps (maxPerDay, cooldowns) prevent notification fatigue; mirrors production
 * push/email throttling for any future LLM-drafted reminder copy.
 */

import { parseGuardianPrefs } from './goalContract.js'
import { toDayKey } from './date.js'

const STORAGE_PREFIX = 'gymtracker_guardian_reminders_'

const CAPS = {
  maxPerDay: 2,
  maxPerWeek: 5,
  minHoursBetween: 4,
  snoozeDaysAfterDoubleDismiss: 7,
}

const COOLDOWNS_HOURS = {
  post_workout: 12,
  weekly_review: 144,
  drift_streak: 48,
  inactivity: 72,
  daily_checkin: 24,
}

function loadState(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId ?? 'local'}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveState(userId, state) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId ?? 'local'}`, JSON.stringify(state))
  } catch {
    /* full */
  }
}

function hoursSince(iso) {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

function isQuietHours(prefs) {
  const hour = new Date().getHours()
  const { start, end } = prefs.quiet_hours ?? { start: 22, end: 7 }
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

function weekKey() {
  const d = new Date()
  return `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`
}

function canSendGlobal(state) {
  const today = toDayKey(new Date())
  if (state.snoozedUntil && Date.now() < new Date(state.snoozedUntil).getTime()) {
    return { ok: false, reason: 'snoozed' }
  }
  if (state.lastReminderDate === today && (state.countToday ?? 0) >= CAPS.maxPerDay) {
    return { ok: false, reason: 'daily_cap' }
  }
  if (state.weekKey === weekKey() && (state.countWeek ?? 0) >= CAPS.maxPerWeek) {
    return { ok: false, reason: 'weekly_cap' }
  }
  if (hoursSince(state.lastReminderAt) < CAPS.minHoursBetween) {
    return { ok: false, reason: 'min_interval' }
  }
  return { ok: true }
}

function recordSent(state, type) {
  const today = toDayKey(new Date())
  const wk = weekKey()
  return {
    ...state,
    lastReminderAt: new Date().toISOString(),
    lastReminderDate: today,
    lastReminderType: type,
    countToday: state.lastReminderDate === today ? (state.countToday ?? 0) + 1 : 1,
    weekKey: wk,
    countWeek: state.weekKey === wk ? (state.countWeek ?? 0) + 1 : 1,
    consecutiveDismissals: 0,
  }
}

function recordDismissal(userId, state) {
  const dismissals = (state.consecutiveDismissals ?? 0) + 1
  const next = { ...state, consecutiveDismissals: dismissals }
  if (dismissals >= 2) {
    const snooze = new Date()
    snooze.setDate(snooze.getDate() + CAPS.snoozeDaysAfterDoubleDismiss)
    next.snoozedUntil = snooze.toISOString()
    next.consecutiveDismissals = 0
  }
  saveState(userId, next)
  return next
}

export function dismissReminder(userId) {
  const state = loadState(userId)
  recordDismissal(userId, state)
}

export function evaluateReminder({
  userId,
  type,
  profile,
  contract,
  sessions,
  workoutMode,
  driftWarningCount = 0,
}) {
  const prefs = parseGuardianPrefs(profile?.notification_preferences)
  if (!prefs.guardian_enabled) return null

  if (workoutMode) return null
  if (isQuietHours(prefs)) return null

  const state = loadState(userId)
  const global = canSendGlobal(state)
  if (!global.ok) return null

  const lastType = state.lastByType ?? {}
  const cooldown = COOLDOWNS_HOURS[type] ?? 24
  if (hoursSince(lastType[type]) < cooldown) return null

  let message = null

  switch (type) {
    case 'post_workout': {
      const today = toDayKey(new Date())
      if (state.lastPostWorkoutDate === today) return null
      message = contract.hasDefinedGoals
        ? `Session logged. Guardian check: does today's work support "${contract.primaryGoal}"?`
        : 'Great session! Set a primary goal in Profile so IronCoach stays on track.'
      break
    }
    case 'weekly_review': {
      const day = new Date().getDay()
      const targetDay = prefs.weekly_review_day ?? 0
      const hour = new Date().getHours()
      if (day !== targetDay || hour < 17 || hour > 21) return null
      message = `Weekly goal review: you're working toward "${contract.primaryGoal}". ${contract.activeGoals[0] ? `Focus: ${contract.activeGoals[0].title}` : 'Add a specific target in Profile.'}`
      break
    }
    case 'drift_streak': {
      if (driftWarningCount < 3) return null
      message =
        'IronCoach drifted from your goals a few times. Tap "Refocus on my goals" in chat for tighter answers.'
      break
    }
    case 'inactivity': {
      if (!sessions?.length) return null
      const last = new Date(sessions[0].date)
      const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 3 || !contract.activeGoals.length) return null
      message = `It's been ${Math.floor(daysSince)} days since your last workout. Your goal "${contract.activeGoals[0].title}" is still waiting — ready for a session?`
      break
    }
    case 'daily_checkin': {
      if (!prefs.daily_checkin) return null
      const morning = new Date().getHours()
      if (morning < 7 || morning > 10) return null
      if (toDayKey(sessions[0]?.date) === toDayKey(new Date())) return null
      message = `Morning check-in: today supports "${contract.primaryGoal}". What's the plan?`
      break
    }
    default:
      return null
  }

  if (!message) return null

  const newState = recordSent(
    {
      ...state,
      lastByType: { ...lastType, [type]: new Date().toISOString() },
      ...(type === 'post_workout' ? { lastPostWorkoutDate: toDayKey(new Date()) } : {}),
    },
    type
  )
  saveState(userId, newState)

  return { type, message, id: `${type}-${Date.now()}` }
}

export function tickReminders({
  userId,
  profile,
  contract,
  sessions,
  workoutMode,
  driftWarningCount = 0,
}) {
  const results = []
  const types = ['weekly_review', 'inactivity', 'daily_checkin']

  for (const type of types) {
    const r = evaluateReminder({
      userId,
      type,
      profile,
      contract,
      sessions,
      workoutMode,
      driftWarningCount,
    })
    if (r) results.push(r)
  }

  return results[0] ?? null
}

export function triggerPostWorkoutReminder({ userId, profile, contract, workoutMode }) {
  return evaluateReminder({
    userId,
    type: 'post_workout',
    profile,
    contract,
    sessions: [],
    workoutMode,
  })
}
