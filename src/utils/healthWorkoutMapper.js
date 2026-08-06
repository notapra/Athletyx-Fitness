import { Capacitor } from '@capacitor/core'
import { createId } from './session.js'

const STRENGTH_WORKOUT_TYPES = new Set([
  'strengthTraining',
  'traditionalStrengthTraining',
  'functionalStrengthTraining',
  'weightlifting',
  'coreTraining',
  'crossTraining',
  'highIntensityIntervalTraining',
  'barbellShoulderPress',
  'benchPress',
  'deadlift',
  'calisthenics',
  'bootCamp',
  'exerciseClass',
  'flexibility',
  'pilates',
  'yoga',
  'other',
])

const SPLIT_BY_TYPE = {
  strengthTraining: 'Strength',
  traditionalStrengthTraining: 'Strength',
  functionalStrengthTraining: 'Strength',
  weightlifting: 'Strength',
  coreTraining: 'Core',
  yoga: 'Mobility',
  pilates: 'Mobility',
}

export function isImportableWorkoutType(workoutType) {
  return STRENGTH_WORKOUT_TYPES.has(workoutType)
}

export function workoutTypeToSplit(workoutType) {
  return SPLIT_BY_TYPE[workoutType] ?? 'Imported'
}

export function healthPlatformId(workout) {
  return workout.platformId || `${workout.startDate}|${workout.workoutType}|${workout.duration}`
}

export function mapHealthWorkoutToSession(workout) {
  const platform = Capacitor.getPlatform()
  const durationMin = Math.max(1, Math.round((workout.duration || 0) / 60))
  const provider = platform === 'ios' ? 'healthkit' : 'health_connect'
  const label = workout.workoutType?.replace(/([A-Z])/g, ' $1').trim() || 'Workout'

  return {
    id: createId(),
    split: workoutTypeToSplit(workout.workoutType),
    duration: durationMin,
    notes: `Imported from ${workout.sourceName || provider} — ${label}`,
    date: workout.startDate,
    exercises: [],
    healthSource: {
      platformId: healthPlatformId(workout),
      provider,
      workoutType: workout.workoutType,
      totalEnergyBurned: workout.totalEnergyBurned,
      totalDistance: workout.totalDistance,
    },
  }
}

export function sessionDurationMinutes(session) {
  if (session.duration > 0) return session.duration
  if (session.startedAt && session.date) {
    const ms = new Date(session.date).getTime() - Number(session.startedAt)
    if (ms > 0) return Math.max(1, Math.round(ms / 60000))
  }
  return 30
}

export function sessionTimeRange(session) {
  const startDate = session.startedAt
    ? new Date(Number(session.startedAt)).toISOString()
    : session.date || new Date().toISOString()
  const durationMin = sessionDurationMinutes(session)
  const endMs = new Date(startDate).getTime() + durationMin * 60_000
  return { startDate, endDate: new Date(endMs).toISOString(), durationMin }
}
