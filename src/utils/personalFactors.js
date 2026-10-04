/**
 * Personal factors for injury-safe coaching — mirrors athletyx.mcp PersonalFactors.
 */

export const DEFAULT_PERSONAL_FACTORS = {
  max_effort_level: 'moderate',
  injury_history: [],
  movement_restrictions: [],
  recovery_capacity: 'average',
  medical_clearance: true,
  notes: '',
}

export const EFFORT_LEVELS = [
  { id: 'conservative', label: 'Conservative (RPE 6–7)' },
  { id: 'moderate', label: 'Moderate (RPE 7–8)' },
  { id: 'aggressive', label: 'Aggressive (RPE 8–9)' },
]

export const RECOVERY_OPTIONS = [
  { id: 'slow', label: 'Slow (72h+)' },
  { id: 'average', label: 'Average (48h)' },
  { id: 'fast', label: 'Fast (24–36h)' },
]

export function getPersonalFactors(profile) {
  const raw = profile?.ai_preferences?.personal_factors ?? {}
  return {
    ...DEFAULT_PERSONAL_FACTORS,
    ...raw,
    injury_history: [...(raw.injury_history ?? [])],
    movement_restrictions: [...(raw.movement_restrictions ?? [])],
  }
}

export function mergePersonalFactors(profile, updates) {
  const current = getPersonalFactors(profile)
  return {
    ...current,
    ...updates,
    injury_history: updates.injury_history ?? current.injury_history,
    movement_restrictions: updates.movement_restrictions ?? current.movement_restrictions,
  }
}
