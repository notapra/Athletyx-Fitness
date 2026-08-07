import assert from 'node:assert/strict'
import {
  listSupportedFormExercises,
  resolveFormCueSet,
} from '../src/utils/formCues.js'

const bench = resolveFormCueSet('Barbell Bench Press')
assert.equal(bench.id, 'bench')
assert.ok(bench.cues.length >= 3)
assert.match(bench.cues.join(' '), /arch|chest|elbow/i)

const tbar = resolveFormCueSet('T-Bar Row')
assert.equal(tbar.id, 'tbar-row')
assert.match(tbar.cues.join(' '), /chest|hinge|elbow/i)

const generic = resolveFormCueSet('Cable crunch')
assert.equal(generic.id, 'generic')

const supported = listSupportedFormExercises()
assert.ok(supported.some((e) => e.id === 'bench'))
assert.ok(!supported.some((e) => e.id === 'generic'))

console.log('formCues: ok')
