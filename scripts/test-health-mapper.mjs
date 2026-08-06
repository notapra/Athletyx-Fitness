import assert from 'node:assert/strict'
import {
  healthPlatformId,
  isImportableWorkoutType,
  mapHealthWorkoutToSession,
  sessionTimeRange,
  workoutTypeToSplit,
} from '../src/utils/healthWorkoutMapper.js'

assert.equal(isImportableWorkoutType('strengthTraining'), true)
assert.equal(isImportableWorkoutType('running'), false)
assert.equal(workoutTypeToSplit('strengthTraining'), 'Strength')

const workout = {
  workoutType: 'strengthTraining',
  duration: 3600,
  startDate: '2026-01-15T10:00:00.000Z',
  endDate: '2026-01-15T11:00:00.000Z',
  platformId: 'hk-123',
  sourceName: 'Apple Watch',
}

const session = mapHealthWorkoutToSession(workout)
assert.equal(session.duration, 60)
assert.equal(session.healthSource.platformId, 'hk-123')
assert.equal(healthPlatformId(workout), 'hk-123')

const range = sessionTimeRange({ date: '2026-01-15T10:00:00.000Z', duration: 45 })
assert.equal(range.durationMin, 45)

console.log('healthWorkoutMapper: ok')
