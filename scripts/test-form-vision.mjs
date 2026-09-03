import assert from 'node:assert/strict'
import {
  formatRelativeAge,
  getLiveVisionCaptureProfile,
  getNearbyExerciseCatalog,
  meanLumaDelta,
} from '../src/services/formVision.js'

const squatCatalog = getNearbyExerciseCatalog('Squat')
assert.ok(squatCatalog.includes('Squat'))
assert.ok(squatCatalog.includes('Front Squat') || squatCatalog.includes('Leg Press'))
assert.ok(squatCatalog.length <= 24)
assert.ok(squatCatalog.length < 40, 'catalog should be trimmed vs full database')

const unknown = getNearbyExerciseCatalog('Mystery Machine Press')
assert.equal(unknown[0], 'Mystery Machine Press')

const a = new Uint8Array([10, 20, 30])
const b = new Uint8Array([10, 20, 30])
assert.equal(meanLumaDelta(a, b), 0)
assert.equal(meanLumaDelta(a, new Uint8Array([20, 20, 30])), 10 / 3)

const profile = getLiveVisionCaptureProfile()
assert.ok(profile.maxWidth <= 480)
assert.ok(profile.quality <= 0.55)
assert.ok(profile.baseIntervalMs >= 2500)

assert.equal(formatRelativeAge(Date.now()), 'just now')
assert.match(formatRelativeAge(Date.now() - 5000) || '', /5s ago/)

console.log('formVision helpers: ok')
