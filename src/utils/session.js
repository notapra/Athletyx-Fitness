export function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function isSession(workout) {
  return Array.isArray(workout?.exercises)
}

export function migrateLegacyWorkout(w) {
  if (isSession(w)) return w

  const setsCount = Math.max(1, Number(w.sets) || 1)
  const reps = Number(w.reps) || 0
  const weight = Number(w.weight) || 0
  const sets = Array.from({ length: setsCount }, () => ({ reps, weight }))

  return {
    id: w.id,
    split: w.split ?? 'Full Body',
    duration: 0,
    notes: '',
    date: w.date ?? new Date().toISOString(),
    exercises: [{ exercise: String(w.exercise ?? '').trim(), sets }],
  }
}

export function flattenSets(session) {
  const rows = []
  if (!isSession(session)) return rows

  for (const block of session.exercises ?? []) {
    const exercise = String(block.exercise ?? '').trim()
    for (const set of block.sets ?? []) {
      rows.push({
        exercise,
        weight: Number(set.weight) || 0,
        reps: Number(set.reps) || 0,
        date: session.date,
        split: session.split,
        sessionId: session.id,
      })
    }
  }
  return rows
}

export function getSessionVolume(session) {
  return flattenSets(session).reduce((sum, s) => sum + s.weight * s.reps, 0)
}

export function getSessionSetCount(session) {
  return flattenSets(session).length
}

export function getSessionExerciseCount(session) {
  return session.exercises?.length ?? 0
}

export function createEmptySession(split = 'Upper') {
  return {
    id: createId(),
    split,
    duration: 0,
    notes: '',
    date: new Date().toISOString(),
    exercises: [],
  }
}

export function createEmptyExercise(name = '') {
  return {
    exercise: name,
    sets: [{ reps: '', weight: '' }],
  }
}

export function createEmptySet(prev = null) {
  if (prev) {
    return { reps: prev.reps ?? '', weight: prev.weight ?? '' }
  }
  return { reps: '', weight: '' }
}

export function normalizeSet(set) {
  return {
    reps: Number(set.reps) || 0,
    weight: Number(set.weight) || 0,
  }
}

export function sessionHasValidSets(session) {
  return (session.exercises ?? []).some((block) =>
    (block.sets ?? []).some((s) => Number(s.weight) > 0 && Number(s.reps) > 0)
  )
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
