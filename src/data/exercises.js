export const WORKOUT_SPLITS = [
  'Push',
  'Pull',
  'Legs',
  'Upper',
  'Lower',
  'Full Body',
]

export const EXERCISE_DATABASE = [
  { name: 'Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', category: 'compound', movementType: 'push' },
  { name: 'Incline Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', category: 'compound', movementType: 'push' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', equipment: 'Dumbbell', category: 'compound', movementType: 'push' },
  { name: 'Overhead Press', muscleGroup: 'Shoulders', equipment: 'Barbell', category: 'compound', movementType: 'push' },
  { name: 'Arnold Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell', category: 'compound', movementType: 'push' },
  { name: 'Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight', category: 'compound', movementType: 'push' },
  { name: 'Dip', muscleGroup: 'Chest', equipment: 'Bodyweight', category: 'compound', movementType: 'push' },
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps', equipment: 'Cable', category: 'isolation', movementType: 'push' },
  { name: 'Skull Crusher', muscleGroup: 'Triceps', equipment: 'Barbell', category: 'isolation', movementType: 'push' },
  { name: 'Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell', category: 'isolation', movementType: 'push' },
  { name: 'Cable Fly', muscleGroup: 'Chest', equipment: 'Cable', category: 'isolation', movementType: 'push' },
  { name: 'Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight', category: 'compound', movementType: 'pull' },
  { name: 'Chin-Up', muscleGroup: 'Back', equipment: 'Bodyweight', category: 'compound', movementType: 'pull' },
  { name: 'Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable', category: 'compound', movementType: 'pull' },
  { name: 'Barbell Row', muscleGroup: 'Back', equipment: 'Barbell', category: 'compound', movementType: 'pull' },
  { name: 'Dumbbell Row', muscleGroup: 'Back', equipment: 'Dumbbell', category: 'compound', movementType: 'pull' },
  { name: 'T-Bar Row', muscleGroup: 'Back', equipment: 'Barbell', category: 'compound', movementType: 'pull' },
  { name: 'Cable Row', muscleGroup: 'Back', equipment: 'Cable', category: 'compound', movementType: 'pull' },
  { name: 'Face Pull', muscleGroup: 'Rear Delts', equipment: 'Cable', category: 'isolation', movementType: 'pull' },
  { name: 'Shrugs', muscleGroup: 'Traps', equipment: 'Dumbbell', category: 'isolation', movementType: 'pull' },
  { name: 'Hammer Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', category: 'isolation', movementType: 'pull' },
  { name: 'Barbell Curl', muscleGroup: 'Biceps', equipment: 'Barbell', category: 'isolation', movementType: 'pull' },
  { name: 'Preacher Curl', muscleGroup: 'Biceps', equipment: 'Barbell', category: 'isolation', movementType: 'pull' },
  { name: 'Squat', muscleGroup: 'Quads', equipment: 'Barbell', category: 'compound', movementType: 'legs' },
  { name: 'Front Squat', muscleGroup: 'Quads', equipment: 'Barbell', category: 'compound', movementType: 'legs' },
  { name: 'Leg Press', muscleGroup: 'Quads', equipment: 'Machine', category: 'compound', movementType: 'legs' },
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', equipment: 'Barbell', category: 'compound', movementType: 'legs' },
  { name: 'Deadlift', muscleGroup: 'Back', equipment: 'Barbell', category: 'compound', movementType: 'legs' },
  { name: 'Sumo Deadlift', muscleGroup: 'Glutes', equipment: 'Barbell', category: 'compound', movementType: 'legs' },
  { name: 'Hip Thrust', muscleGroup: 'Glutes', equipment: 'Barbell', category: 'compound', movementType: 'legs' },
  { name: 'Lunge', muscleGroup: 'Quads', equipment: 'Dumbbell', category: 'compound', movementType: 'legs' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Quads', equipment: 'Dumbbell', category: 'compound', movementType: 'legs' },
  { name: 'Leg Extension', muscleGroup: 'Quads', equipment: 'Machine', category: 'isolation', movementType: 'legs' },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings', equipment: 'Machine', category: 'isolation', movementType: 'legs' },
  { name: 'Calf Raise', muscleGroup: 'Calves', equipment: 'Machine', category: 'isolation', movementType: 'legs' },
  { name: 'Hanging Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight', category: 'isolation', movementType: 'legs' },
  { name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight', category: 'isolation', movementType: 'legs' },
]

export const EXERCISE_SUGGESTIONS = EXERCISE_DATABASE.map((e) => e.name)

export const MUSCLE_GROUPS = [...new Set(EXERCISE_DATABASE.map((e) => e.muscleGroup))].sort()

export function getExerciseMeta(name) {
  const key = String(name ?? '').trim().toLowerCase()
  return EXERCISE_DATABASE.find((e) => e.name.toLowerCase() === key) ?? null
}

export function filterExerciseSuggestions(query, limit = 8) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return EXERCISE_SUGGESTIONS.slice(0, limit)
  return EXERCISE_SUGGESTIONS.filter((name) => name.toLowerCase().includes(q)).slice(0, limit)
}

export function filterExercises({ query = '', muscleGroup = 'all', movementType = 'all' } = {}) {
  const q = query.trim().toLowerCase()
  return EXERCISE_DATABASE.filter((e) => {
    const matchesQuery =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.muscleGroup.toLowerCase().includes(q) ||
      e.equipment.toLowerCase().includes(q)
    const matchesMuscle = muscleGroup === 'all' || e.muscleGroup === muscleGroup
    const matchesMovement = movementType === 'all' || e.movementType === movementType
    return matchesQuery && matchesMuscle && matchesMovement
  })
}
