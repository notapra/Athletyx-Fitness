export const SUB_MUSCLES = [
  { id: 'pec_upper', label: 'Upper Pectoral', parentGroup: 'Chest', view: 'front', region: 'Chest' },
  { id: 'pec_lower', label: 'Lower Pectoral', parentGroup: 'Chest', view: 'front', region: 'Chest' },
  { id: 'deltoid_anterior', label: 'Anterior Deltoid', parentGroup: 'Shoulders', view: 'front', region: 'Delts' },
  { id: 'deltoid_lateral', label: 'Lateral Deltoid', parentGroup: 'Shoulders', view: 'front', region: 'Delts' },
  { id: 'deltoid_posterior', label: 'Posterior Deltoid', parentGroup: 'Rear Delts', view: 'back', region: 'Delts' },
  { id: 'biceps_long', label: 'Biceps Long Head', parentGroup: 'Biceps', view: 'front', region: 'Arms' },
  { id: 'biceps_short', label: 'Biceps Short Head', parentGroup: 'Biceps', view: 'front', region: 'Arms' },
  { id: 'brachialis', label: 'Brachialis', parentGroup: 'Biceps', view: 'front', region: 'Arms' },
  { id: 'triceps_lateral', label: 'Triceps Lateral Head', parentGroup: 'Triceps', view: 'back', region: 'Arms' },
  { id: 'triceps_long', label: 'Triceps Long Head', parentGroup: 'Triceps', view: 'back', region: 'Arms' },
  { id: 'triceps_medial', label: 'Triceps Medial Head', parentGroup: 'Triceps', view: 'back', region: 'Arms' },
  { id: 'lats', label: 'Latissimus Dorsi', parentGroup: 'Back', view: 'back', region: 'Back' },
  { id: 'rhomboids', label: 'Rhomboids', parentGroup: 'Back', view: 'back', region: 'Back' },
  { id: 'traps_upper', label: 'Upper Traps', parentGroup: 'Traps', view: 'back', region: 'Back' },
  { id: 'traps_lower', label: 'Lower Traps', parentGroup: 'Traps', view: 'back', region: 'Back' },
  { id: 'rectus_femoris', label: 'Rectus Femoris', parentGroup: 'Quads', view: 'front', region: 'Legs' },
  { id: 'vastus_lateralis', label: 'Vastus Lateralis', parentGroup: 'Quads', view: 'front', region: 'Legs' },
  { id: 'vastus_medialis', label: 'Vastus Medialis', parentGroup: 'Quads', view: 'front', region: 'Legs' },
  { id: 'hamstrings_biceps_femoris', label: 'Biceps Femoris', parentGroup: 'Hamstrings', view: 'back', region: 'Legs' },
  { id: 'hamstrings_semitendinosus', label: 'Semitendinosus', parentGroup: 'Hamstrings', view: 'back', region: 'Legs' },
  { id: 'glutes', label: 'Glutes', parentGroup: 'Glutes', view: 'back', region: 'Legs' },
  { id: 'gastrocnemius', label: 'Gastrocnemius', parentGroup: 'Calves', view: 'back', region: 'Legs' },
  { id: 'soleus', label: 'Soleus', parentGroup: 'Calves', view: 'back', region: 'Legs' },
  { id: 'core_rectus', label: 'Rectus Abdominis', parentGroup: 'Core', view: 'front', region: 'Core' },
  { id: 'core_obliques', label: 'Obliques', parentGroup: 'Core', view: 'front', region: 'Core' },
]

export const SUB_MUSCLE_BY_ID = Object.fromEntries(SUB_MUSCLES.map((m) => [m.id, m]))

export const PARENT_GROUPS = [...new Set(SUB_MUSCLES.map((m) => m.parentGroup))].sort()

export const REGIONS = [...new Set(SUB_MUSCLES.map((m) => m.region))]

export function getSubMuscle(id) {
  return SUB_MUSCLE_BY_ID[id] ?? null
}

export function getSubMusclesByRegion() {
  const map = new Map()
  for (const m of SUB_MUSCLES) {
    if (!map.has(m.region)) map.set(m.region, [])
    map.get(m.region).push(m)
  }
  return map
}

export function getSubMusclesForView(view) {
  return SUB_MUSCLES.filter((m) => m.view === view || m.view === 'both')
}
