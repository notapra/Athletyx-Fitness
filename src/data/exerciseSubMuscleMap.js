import { EXERCISE_DATABASE } from './exercises.js'
import { SUB_MUSCLE_BY_ID } from './subMuscles.js'

export const DEFAULT_PARENT_SPLITS = {
  Chest: { pec_upper: 0.5, pec_lower: 0.5 },
  Shoulders: { deltoid_anterior: 0.4, deltoid_lateral: 0.35, deltoid_posterior: 0.25 },
  'Rear Delts': { deltoid_posterior: 1 },
  Triceps: { triceps_lateral: 0.35, triceps_long: 0.4, triceps_medial: 0.25 },
  Biceps: { biceps_long: 0.45, biceps_short: 0.35, brachialis: 0.2 },
  Back: { lats: 0.5, rhomboids: 0.3, traps_lower: 0.2 },
  Traps: { traps_upper: 0.7, traps_lower: 0.3 },
  Quads: { rectus_femoris: 0.35, vastus_lateralis: 0.35, vastus_medialis: 0.3 },
  Hamstrings: { hamstrings_biceps_femoris: 0.55, hamstrings_semitendinosus: 0.45 },
  Glutes: { glutes: 1 },
  Calves: { gastrocnemius: 0.65, soleus: 0.35 },
  Core: { core_rectus: 0.6, core_obliques: 0.4 },
  Other: { core_rectus: 0.5, core_obliques: 0.5 },
}

export const EXERCISE_SUB_MUSCLE_MAP = {
  'Bench Press': { pec_upper: 0.35, pec_lower: 0.35, triceps_long: 0.15, deltoid_anterior: 0.15 },
  'Incline Bench Press': { pec_upper: 0.55, pec_lower: 0.2, deltoid_anterior: 0.15, triceps_long: 0.1 },
  'Dumbbell Bench Press': { pec_upper: 0.4, pec_lower: 0.35, triceps_long: 0.15, deltoid_anterior: 0.1 },
  'Overhead Press': { deltoid_anterior: 0.45, deltoid_lateral: 0.3, triceps_long: 0.15, traps_upper: 0.1 },
  'Arnold Press': { deltoid_anterior: 0.35, deltoid_lateral: 0.35, deltoid_posterior: 0.15, triceps_long: 0.15 },
  'Push-Up': { pec_upper: 0.35, pec_lower: 0.35, triceps_long: 0.15, deltoid_anterior: 0.15 },
  Dip: { pec_lower: 0.35, triceps_long: 0.35, triceps_lateral: 0.2, deltoid_anterior: 0.1 },
  'Tricep Pushdown': { triceps_lateral: 0.5, triceps_medial: 0.35, triceps_long: 0.15 },
  'Skull Crusher': { triceps_long: 0.55, triceps_lateral: 0.3, triceps_medial: 0.15 },
  'Lateral Raise': { deltoid_lateral: 0.85, deltoid_anterior: 0.15 },
  'Cable Fly': { pec_upper: 0.45, pec_lower: 0.55 },
  'Pull-Up': { lats: 0.55, biceps_long: 0.2, rhomboids: 0.15, brachialis: 0.1 },
  'Chin-Up': { lats: 0.4, biceps_long: 0.3, biceps_short: 0.2, brachialis: 0.1 },
  'Lat Pulldown': { lats: 0.65, biceps_long: 0.15, rhomboids: 0.1, brachialis: 0.1 },
  'Barbell Row': { lats: 0.35, rhomboids: 0.35, traps_lower: 0.15, biceps_long: 0.15 },
  'Dumbbell Row': { lats: 0.4, rhomboids: 0.3, biceps_long: 0.15, traps_lower: 0.15 },
  'T-Bar Row': { lats: 0.35, rhomboids: 0.35, traps_lower: 0.2, biceps_long: 0.1 },
  'Cable Row': { rhomboids: 0.35, lats: 0.35, traps_lower: 0.15, biceps_long: 0.15 },
  'Face Pull': { deltoid_posterior: 0.55, rhomboids: 0.25, traps_lower: 0.2 },
  Shrugs: { traps_upper: 0.85, traps_lower: 0.15 },
  'Hammer Curl': { brachialis: 0.5, biceps_long: 0.3, biceps_short: 0.2 },
  'Barbell Curl': { biceps_short: 0.45, biceps_long: 0.45, brachialis: 0.1 },
  'Preacher Curl': { biceps_short: 0.65, brachialis: 0.25, biceps_long: 0.1 },
  Squat: { rectus_femoris: 0.3, vastus_lateralis: 0.3, vastus_medialis: 0.25, glutes: 0.15 },
  'Front Squat': { rectus_femoris: 0.35, vastus_medialis: 0.35, vastus_lateralis: 0.2, core_rectus: 0.1 },
  'Leg Press': { vastus_lateralis: 0.35, vastus_medialis: 0.35, rectus_femoris: 0.2, glutes: 0.1 },
  'Romanian Deadlift': { hamstrings_biceps_femoris: 0.45, hamstrings_semitendinosus: 0.35, glutes: 0.2 },
  Deadlift: { hamstrings_biceps_femoris: 0.25, glutes: 0.25, lats: 0.2, traps_lower: 0.15, traps_upper: 0.15 },
  'Sumo Deadlift': { glutes: 0.35, hamstrings_biceps_femoris: 0.25, vastus_medialis: 0.2, traps_upper: 0.2 },
  'Hip Thrust': { glutes: 0.85, hamstrings_semitendinosus: 0.15 },
  Lunge: { vastus_lateralis: 0.3, vastus_medialis: 0.3, rectus_femoris: 0.25, glutes: 0.15 },
  'Bulgarian Split Squat': { vastus_lateralis: 0.3, vastus_medialis: 0.3, glutes: 0.25, rectus_femoris: 0.15 },
  'Leg Extension': { rectus_femoris: 0.4, vastus_lateralis: 0.35, vastus_medialis: 0.25 },
  'Leg Curl': { hamstrings_biceps_femoris: 0.55, hamstrings_semitendinosus: 0.45 },
  'Calf Raise': { gastrocnemius: 0.7, soleus: 0.3 },
  'Hanging Leg Raise': { core_rectus: 0.75, core_obliques: 0.25 },
  Plank: { core_rectus: 0.55, core_obliques: 0.45 },
}

export function getExerciseSubMuscleWeights(exerciseName) {
  const key = String(exerciseName ?? '').trim()
  const exact = EXERCISE_SUB_MUSCLE_MAP[key]
  if (exact) return exact

  const meta = EXERCISE_DATABASE.find((e) => e.name.toLowerCase() === key.toLowerCase())
  const parent = meta?.muscleGroup ?? 'Other'
  return DEFAULT_PARENT_SPLITS[parent] ?? DEFAULT_PARENT_SPLITS.Other
}

export function getExercisesForSubMuscle(subMuscleId) {
  return Object.entries(EXERCISE_SUB_MUSCLE_MAP)
    .filter(([, weights]) => (weights[subMuscleId] ?? 0) > 0.1)
    .map(([name]) => name)
}

export function validateSubMuscleMap() {
  for (const [name, weights] of Object.entries(EXERCISE_SUB_MUSCLE_MAP)) {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 1) > 0.01) {
      console.warn(`Exercise ${name} weights sum to ${sum}`)
    }
    for (const id of Object.keys(weights)) {
      if (!SUB_MUSCLE_BY_ID[id]) console.warn(`Unknown sub-muscle ${id} in ${name}`)
    }
  }
}
