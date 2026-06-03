/** Simplified muscle map — fewer regions, human-like silhouette. Analytics still use sub-muscle IDs under the hood. */

export const BODY_VIEWBOX = '0 0 200 400'

/** Stylized front figure: head, neck, shoulders, tapered waist, legs with knees. */
export const FRONT_BODY_OUTLINE =
  'M 100 8 C 81 8 69 22 69 37 C 69 50 78 58 88 61 L 86 70 C 66 74 48 88 40 108 C 34 124 32 142 34 162 C 36 178 42 186 48 188 L 44 228 L 42 288 L 44 348 L 48 392 L 66 392 L 68 348 L 70 288 L 74 228 L 80 182 L 86 152 L 92 128 L 96 118 L 100 114 L 104 118 L 108 128 L 114 152 L 120 182 L 126 228 L 130 288 L 132 348 L 134 392 L 152 392 L 156 348 L 158 288 L 156 228 L 152 188 C 158 186 164 178 166 162 C 168 142 166 124 160 108 C 152 88 134 74 114 70 L 112 61 C 122 58 131 50 131 37 C 131 22 119 8 100 8 Z'

/** Back view — same silhouette; muscle overlays differ. */
export const BACK_BODY_OUTLINE = FRONT_BODY_OUTLINE

/**
 * Map region id → { label, subMuscleIds, path }
 * Fewer clickable areas; scores are volume-weighted averages of sub-muscles.
 */
export const FRONT_REGIONS = {
  shoulders: {
    label: 'Shoulders',
    subMuscleIds: ['deltoid_anterior', 'deltoid_lateral'],
    path:
      'M 40 108 C 48 88 66 74 86 70 L 92 98 L 52 112 Z M 160 108 C 152 88 134 74 114 70 L 108 98 L 148 112 Z',
  },
  chest: {
    label: 'Chest',
    subMuscleIds: ['pec_upper', 'pec_lower'],
    path: 'M 68 98 C 84 92 100 90 116 98 L 122 128 C 100 136 78 128 68 128 Z',
  },
  arms: {
    label: 'Arms',
    subMuscleIds: ['biceps_long', 'biceps_short', 'brachialis'],
    path:
      'M 34 162 C 36 142 40 124 48 112 L 52 112 L 56 168 L 52 218 L 44 208 L 38 182 Z M 166 162 C 164 142 160 124 152 112 L 148 112 L 144 168 L 148 218 L 156 208 L 162 182 Z',
  },
  core: {
    label: 'Core',
    subMuscleIds: ['core_rectus', 'core_obliques'],
    path: 'M 72 128 L 128 128 L 124 182 C 100 190 76 182 72 182 Z',
  },
  legs: {
    label: 'Legs (quads)',
    subMuscleIds: ['rectus_femoris', 'vastus_lateralis', 'vastus_medialis'],
    path:
      'M 74 182 L 126 182 L 130 288 L 132 348 L 134 392 L 104 392 L 100 280 L 96 392 L 66 392 L 68 348 L 70 288 Z',
  },
}

export const BACK_REGIONS = {
  shoulders: {
    label: 'Shoulders',
    subMuscleIds: ['deltoid_posterior'],
    path:
      'M 40 108 C 48 88 66 74 86 70 L 92 98 L 52 112 Z M 160 108 C 152 88 134 74 114 70 L 108 98 L 148 112 Z',
  },
  back: {
    label: 'Back',
    subMuscleIds: ['lats', 'rhomboids', 'traps_upper', 'traps_lower'],
    path: 'M 52 98 L 148 98 L 142 182 C 100 192 58 182 52 182 Z',
  },
  arms: {
    label: 'Arms',
    subMuscleIds: ['triceps_lateral', 'triceps_long', 'triceps_medial'],
    path:
      'M 34 162 C 36 142 40 124 48 112 L 52 112 L 56 168 L 52 218 L 44 208 L 38 182 Z M 166 162 C 164 142 160 124 152 112 L 148 112 L 144 168 L 148 218 L 156 208 L 162 182 Z',
  },
  glutes: {
    label: 'Glutes',
    subMuscleIds: ['glutes'],
    path: 'M 72 182 L 128 182 L 124 228 C 100 236 76 228 72 228 Z',
  },
  legs: {
    label: 'Legs',
    subMuscleIds: [
      'hamstrings_biceps_femoris',
      'hamstrings_semitendinosus',
      'gastrocnemius',
      'soleus',
    ],
    path:
      'M 74 228 L 126 228 L 130 288 L 132 348 L 134 392 L 104 392 L 100 280 L 96 392 L 66 392 L 68 348 L 70 288 Z',
  },
}

export function getRegionsForView(view) {
  return view === 'back' ? BACK_REGIONS : FRONT_REGIONS
}

/** @deprecated Use getRegionsForView — kept for any legacy imports */
export function getPathsForView(view) {
  const regions = getRegionsForView(view)
  return Object.fromEntries(
    Object.entries(regions).map(([id, r]) => [id, r.path])
  )
}

export function getMuscleIdsForView(view) {
  return Object.keys(getRegionsForView(view))
}
