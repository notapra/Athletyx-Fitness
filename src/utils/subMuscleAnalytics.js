import { SUB_MUSCLES, SUB_MUSCLE_BY_ID, getSubMusclesByRegion } from '../data/subMuscles.js'
import { getExerciseSubMuscleWeights } from '../data/exerciseSubMuscleMap.js'
import { filterSessionsByDays } from './aiHelpers.js'
import { getAllSets, normalizeSessions } from './calculations.js'
import { toDayKey } from './date.js'

export const TIER_COLORS = {
  neglected: '#EF4444',
  intermediate: '#F59E0B',
  strong: '#4DF0FF',
  elite: '#7C3AED',
}

export function getStrengthTier(score, volume = 0) {
  if (volume <= 0) {
    return { tier: 'neglected', label: 'Needs improvement', color: TIER_COLORS.neglected, score: 0 }
  }
  const s = Math.round(Math.max(0, Math.min(100, score)))
  if (s <= 20) return { tier: 'neglected', label: 'Needs improvement', color: TIER_COLORS.neglected, score: s }
  if (s <= 65) return { tier: 'intermediate', label: 'Intermediate', color: TIER_COLORS.intermediate, score: s }
  if (s <= 85) return { tier: 'strong', label: 'Strong', color: TIER_COLORS.strong, score: s }
  return { tier: 'elite', label: 'Elite', color: TIER_COLORS.elite, score: s }
}

function distributeSetVolume(exerciseName, setVolume) {
  const weights = getExerciseSubMuscleWeights(exerciseName)
  const result = new Map()
  for (const [id, w] of Object.entries(weights)) {
    result.set(id, (result.get(id) ?? 0) + setVolume * w)
  }
  return result
}

export function aggregateSubMuscleVolume(sessions, { days = 30, includeActiveSession = null } = {}) {
  const normalized = normalizeSessions(sessions)
  const windowSessions = days ? filterSessionsByDays(normalized, days) : normalized
  const allSessions = includeActiveSession
    ? [includeActiveSession, ...windowSessions.filter((s) => s.id !== includeActiveSession?.id)]
    : windowSessions

  const volumeMap = new Map()
  const setsMap = new Map()
  const todayKey = toDayKey(new Date())
  const todayMap = new Map()

  for (const session of allSessions) {
    const sessionKey = toDayKey(session.date)
    const isToday = sessionKey === todayKey

    for (const block of session.exercises ?? []) {
      const exercise = String(block.exercise ?? '').trim()
      if (!exercise) continue

      for (const set of block.sets ?? []) {
        const vol = (Number(set.weight) || 0) * (Number(set.reps) || 0)
        if (vol <= 0) continue

        const distributed = distributeSetVolume(exercise, vol)
        for (const [id, v] of distributed) {
          volumeMap.set(id, (volumeMap.get(id) ?? 0) + v)
          setsMap.set(id, (setsMap.get(id) ?? 0) + 1)
          if (isToday) {
            todayMap.set(id, (todayMap.get(id) ?? 0) + v)
          }
        }
      }
    }
  }

  return { volumeMap, setsMap, todayMap }
}

export function computeStrengthScores(volumeMap) {
  const volumes = SUB_MUSCLES.map((m) => volumeMap.get(m.id) ?? 0)
  const nonZero = volumes.filter((v) => v > 0)
  const maxVol = nonZero.length ? Math.max(...nonZero) : 1
  const sorted = [...nonZero].sort((a, b) => a - b)
  const p90Index = Math.floor(sorted.length * 0.9)
  const p90 = sorted.length ? sorted[Math.min(p90Index, sorted.length - 1)] : maxVol
  const baseline = Math.max(p90, maxVol * 0.5, 1)

  const scores = new Map()
  for (const m of SUB_MUSCLES) {
    const vol = volumeMap.get(m.id) ?? 0
    const raw = vol <= 0 ? 0 : Math.round((vol / baseline) * 85)
    scores.set(m.id, Math.min(100, raw))
  }
  return scores
}

export function buildMuscleScoreboard(sessions, options = {}) {
  const { days = 30, includeActiveSession = null } = options
  const { volumeMap, setsMap, todayMap } = aggregateSubMuscleVolume(sessions, {
    days,
    includeActiveSession,
  })
  const scores = computeStrengthScores(volumeMap)

  const muscles = SUB_MUSCLES.map((m) => {
    const volume = volumeMap.get(m.id) ?? 0
    const sets = setsMap.get(m.id) ?? 0
    const todayVolume = todayMap.get(m.id) ?? 0
    const score = scores.get(m.id) ?? 0
    const tier = getStrengthTier(score, volume)
    return {
      ...m,
      volume,
      sets,
      todayVolume,
      score: tier.score,
      tier: tier.tier,
      tierLabel: tier.label,
      color: tier.color,
    }
  })

  return { muscles, volumeMap, setsMap, todayMap, scores }
}

const IMBALANCE_RULES = [
  {
    id: 'delt_balance',
    label: 'Deltoid balance',
    muscles: ['deltoid_anterior', 'deltoid_lateral', 'deltoid_posterior'],
    threshold: 0.35,
    message: (high, low) =>
      `${high.label} volume is high (${high.sets} sets) but ${low.label} is neglected (${low.sets} sets). Add rear-delt or lateral work.`,
  },
  {
    id: 'tricep_heads',
    label: 'Triceps heads',
    muscles: ['triceps_lateral', 'triceps_long', 'triceps_medial'],
    threshold: 0.4,
    message: (high, low) =>
      `${low.label} is under-stimulated vs ${high.label}. Rotate pushdown angles or overhead extensions.`,
  },
  {
    id: 'quad_ham',
    label: 'Quad / hamstring',
    muscles: ['rectus_femoris', 'hamstrings_biceps_femoris'],
    threshold: 0.4,
    message: (high, low) =>
      `${low.label} lagging behind ${high.label}. Balance leg day with RDLs or leg curls.`,
  },
]

export function getSubMuscleImbalances(muscles) {
  const byId = Object.fromEntries(muscles.map((m) => [m.id, m]))
  const warnings = []

  for (const rule of IMBALANCE_RULES) {
    const group = rule.muscles.map((id) => byId[id]).filter(Boolean)
    if (group.length < 2) continue

    const sorted = [...group].sort((a, b) => b.sets - a.sets)
    const high = sorted[0]
    const low = sorted[sorted.length - 1]

    if (high.sets >= 3 && low.sets === 0) {
      warnings.push({
        id: rule.id,
        severity: 'warning',
        message: rule.message(high, low),
        highId: high.id,
        lowId: low.id,
      })
    } else if (high.sets > 0 && low.sets / Math.max(high.sets, 1) < rule.threshold && high.sets >= 4) {
      warnings.push({
        id: rule.id,
        severity: 'caution',
        message: rule.message(high, low),
        highId: high.id,
        lowId: low.id,
      })
    }
  }

  return warnings
}

export function getIslandSummary(muscles, todayMap) {
  const todayIds = [...todayMap.entries()].filter(([, v]) => v > 0).map(([id]) => id)
  const todayLabels = todayIds
    .map((id) => SUB_MUSCLE_BY_ID[id]?.region)
    .filter(Boolean)
  const uniqueRegions = [...new Set(todayLabels)]

  const label =
    uniqueRegions.length > 0
      ? `Today · ${uniqueRegions.slice(0, 3).join(' · ')}`
      : 'Today · No sets logged'

  const parentStatus = new Map()
  for (const m of muscles) {
    const existing = parentStatus.get(m.parentGroup)
    const status =
      m.volume <= 0 ? 'neglected' : m.tier === 'elite' || m.tier === 'strong' ? 'hit' : 'partial'
    if (!existing || status === 'neglected') {
      parentStatus.set(m.parentGroup, status)
    } else if (status === 'hit' && existing === 'partial') {
      parentStatus.set(m.parentGroup, 'hit')
    }
  }

  const dots = [...parentStatus.entries()].slice(0, 8).map(([group, status]) => ({
    group,
    status,
    color:
      status === 'hit'
        ? TIER_COLORS.strong
        : status === 'partial'
          ? TIER_COLORS.intermediate
          : TIER_COLORS.neglected,
  }))

  return { label, dots, todayRegions: uniqueRegions }
}

export function getCoachIslandInsight(muscles, analysis, imbalances) {
  if (!muscles.some((m) => m.volume > 0)) {
    return 'Log your first working sets — I will map volume across every muscle head and flag imbalances instantly.'
  }

  const parts = []

  if (analysis?.recovery) {
    const r = analysis.recovery.readiness
    if (r >= 75) parts.push(`Recovery readiness is ${r}% — good day to push weak points.`)
    else if (r < 55) parts.push(`Readiness at ${r}% — prioritize quality reps over max load today.`)
  }

  const neglected = muscles.filter((m) => m.tier === 'neglected' && m.volume <= 0)
  if (neglected.length > 0) {
    parts.push(
      `${neglected.length} sub-muscle${neglected.length > 1 ? 's' : ''} untouched in the last 30 days (e.g. ${neglected[0].label}).`
    )
  }

  if (imbalances.length > 0) {
    parts.push(imbalances[0].message)
  } else {
    const elite = muscles.filter((m) => m.tier === 'elite')
    if (elite.length > 0) {
      parts.push(`${elite[0].label} is in elite tier — maintain stimulus without overshooting recovery.`)
    } else {
      parts.push('Volume distribution looks balanced across tracked muscle heads.')
    }
  }

  return parts.slice(0, 2).join(' ')
}

export function estimateSubMuscle1RM(subMuscleId, sessions) {
  const rows = getAllSets(sessions)
  let best = 0

  for (const row of rows) {
    const weights = getExerciseSubMuscleWeights(row.exercise)
    const contribution = weights[subMuscleId] ?? 0
    if (contribution < 0.15) continue
    const w = Number(row.weight) || 0
    if (w > best) best = w
  }

  return best > 0 ? best : null
}

/** Roll up sub-muscle stats into a simplified map region (volume-weighted score). */
export function aggregateRegionMuscle(regionId, regionDef, muscleById) {
  const parts = regionDef.subMuscleIds
    .map((id) => muscleById[id])
    .filter(Boolean)

  const volume = parts.reduce((sum, p) => sum + p.volume, 0)
  const sets = parts.reduce((sum, p) => sum + p.sets, 0)
  const todayVolume = parts.reduce((sum, p) => sum + (p.todayVolume ?? 0), 0)

  const score =
    volume > 0
      ? Math.round(parts.reduce((sum, p) => sum + p.score * p.volume, 0) / volume)
      : 0

  const tier = getStrengthTier(score, volume)

  return {
    id: regionId,
    label: regionDef.label,
    volume,
    sets,
    todayVolume,
    score: tier.score,
    tier: tier.tier,
    tierLabel: tier.label,
    color: tier.color,
    subMuscleIds: regionDef.subMuscleIds,
  }
}

export function getRegionDisplayTip(muscle) {
  if (!muscle) return 'Keep logging sets to unlock personalized cues.'
  if (muscle.volume <= 0) {
    return `No volume in 30 days for ${muscle.label}. Add 2–3 hard sets this week (RPE 7–8).`
  }
  if (muscle.tier === 'neglected' || muscle.tier === 'intermediate') {
    return `${muscle.label} needs more work — add 2–4 weekly sets with controlled reps.`
  }
  if (muscle.tier === 'strong') {
    return `${muscle.label} is developing well. Progress load when sets hit target reps.`
  }
  return `${muscle.label} is elite tier. Maintain or chase a new PR.`
}

export function getMuscleTip(subMuscle, sessions) {
  const m = typeof subMuscle === 'string' ? SUB_MUSCLE_BY_ID[subMuscle] : subMuscle
  if (!m) return 'Keep logging sets to unlock personalized cues.'

  const board = buildMuscleScoreboard(sessions, { days: 30 })
  const data = board.muscles.find((x) => x.id === m.id)
  if (!data) return 'Add exercises that target this region.'

  if (data.volume <= 0) {
    return `No direct volume in 30 days. Add an isolation movement for ${m.label} (2–3 sets, RPE 7–8).`
  }
  if (data.tier === 'neglected' || data.tier === 'intermediate') {
    return `Increase weekly sets on ${m.label} by 2–4. Focus on mind-muscle connection and full ROM.`
  }
  if (data.tier === 'strong') {
    return `${m.label} is developing well. Progress load 2.5–5 lbs when all sets hit target reps.`
  }
  return `${m.label} is elite tier. Use maintenance volume or peak for a new PR attempt.`
}

export function getRegionGrid(muscles) {
  const regionMap = getSubMusclesByRegion()
  const byId = Object.fromEntries(muscles.map((m) => [m.id, m]))
  const grid = []

  for (const [region, defs] of regionMap) {
    grid.push({
      region,
      items: defs.map((d) => byId[d.id] ?? { ...d, volume: 0, sets: 0, tier: 'neglected', tierLabel: 'Needs improvement', color: TIER_COLORS.neglected }),
    })
  }
  return grid
}
