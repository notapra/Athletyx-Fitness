/**
 * Exercise form cues for Form Vision — text-first so cue mode works without camera.
 * Pose ML can attach later; cues stay the accessible coaching layer.
 */

const LIBRARY = [
  {
    id: 'bench',
    match: [/bench\s*press/i, /\bbench\b/i],
    title: 'Bench press',
    cues: [
      'Plant feet; drive through the floor without lifting hips off the pad.',
      'Keep a stable upper-back arch — chest up, shoulder blades pinched.',
      'Wrists stacked over elbows; bar path slightly diagonal toward lower chest.',
      'Control the touch; do not bounce the bar off the chest.',
      'Lock out without slamming elbows; keep shoulders packed.',
    ],
  },
  {
    id: 'tbar-row',
    match: [/t[-\s]?bar\s*row/i, /landmine\s*row/i],
    title: 'T-bar / landmine row',
    cues: [
      'Hinge at the hips; keep a long spine — avoid rounding the low back.',
      'Chest rises slightly with the pull; do not yank with only the arms.',
      'Pull elbows past the torso; squeeze mid-back at the top.',
      'Lower under control; do not let the plate crash between reps.',
      'Brace the core so the hips stay quiet while the arms move.',
    ],
  },
  {
    id: 'squat',
    match: [/back\s*squat/i, /front\s*squat/i, /\bsquat\b/i],
    title: 'Squat',
    cues: [
      'Brace before you unrack; ribs stacked over pelvis.',
      'Knees track over mid-foot; avoid collapsing inward.',
      'Sit between the hips; depth only as far as you keep a neutral spine.',
      'Drive up evenly — push the floor away without shifting forward onto toes.',
    ],
  },
  {
    id: 'deadlift',
    match: [/deadlift/i, /\brdl\b/i, /romanian/i],
    title: 'Deadlift',
    cues: [
      'Bar over mid-foot; shins close without shoving the bar away.',
      'Lats on — drag the bar up the legs; keep it close.',
      'Hips and shoulders rise together; do not strip the hips early.',
      'Finish tall without hyperextending the low back.',
    ],
  },
  {
    id: 'ohp',
    match: [/overhead\s*press/i, /shoulder\s*press/i, /\bohp\b/i],
    title: 'Overhead press',
    cues: [
      'Ribs down; avoid excessive lower-back arch under the bar.',
      'Press in a slight arc; finish stacked over the mid-foot.',
      'Keep elbows under the wrists through the press.',
      'If shoulder pain appears, stop and switch to a pain-free variation.',
    ],
  },
  {
    id: 'generic',
    match: [/.*/],
    title: 'General form',
    cues: [
      'Move with control — no bouncing out of the bottom.',
      'Breathe and brace before the hard part of each rep.',
      'Keep joints stacked; stop if you feel sharp pain.',
      'Film a side or 45° angle when using camera mode for clearer self-checks.',
    ],
  },
]

export function resolveFormCueSet(exerciseName) {
  const name = String(exerciseName || '').trim()
  for (const entry of LIBRARY) {
    if (entry.id === 'generic') continue
    if (entry.match.some((re) => re.test(name))) {
      return { id: entry.id, title: entry.title, cues: [...entry.cues] }
    }
  }
  const generic = LIBRARY.find((e) => e.id === 'generic')
  return { id: 'generic', title: name || generic.title, cues: [...generic.cues] }
}

export function listSupportedFormExercises() {
  return LIBRARY.filter((e) => e.id !== 'generic').map((e) => ({
    id: e.id,
    title: e.title,
  }))
}
