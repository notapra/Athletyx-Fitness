export function toDayKey(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return toDayKey(new Date())

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatLongDate(date) {
  const d = new Date(date)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShortDate(date) {
  const d = new Date(date)
  const wd = d.toLocaleDateString(undefined, { weekday: 'short' })
  const rest = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${wd} · ${rest}`
}

export function formatRelativeLabel(date) {
  const d = stripTime(new Date(date))
  if (Number.isNaN(d.getTime())) return 'Recently'

  const today = stripTime(new Date())
  const diffMs = today.getTime() - d.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatShortDate(date)
}

export function getTrainingStreak(workouts) {
  const keys = new Set(workouts.map((w) => toDayKey(w.date)))

  let cursor = stripTime(new Date())
  let streak = 0

  const has = (day) => keys.has(toDayKey(day))

  if (!has(cursor)) {
    cursor = addDays(cursor, -1)
  }

  while (has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }

  return streak
}

export function trainedToday(workouts) {
  const keys = new Set(workouts.map((w) => toDayKey(w.date)))
  return keys.has(toDayKey(new Date()))
}

function stripTime(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return stripTime(x)
}
