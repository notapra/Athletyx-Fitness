import { getExerciseMeta, MUSCLE_GROUPS } from '../data/exercises.js'
import { filterSessionsByDays } from './aiHelpers.js'

export function analyzeMuscleBalance(sessions, days = 14) {
  const windowSessions = filterSessionsByDays(sessions, days)
  const volumeByMuscle = new Map()
  const setsByMuscle = new Map()
  const movementVolume = { push: 0, pull: 0, legs: 0 }
  const lastTrained = new Map()

  for (const session of windowSessions) {
    const day = new Date(session.date).getTime()
    for (const block of session.exercises ?? []) {
      const meta = getExerciseMeta(block.exercise)
      const muscle = meta?.muscleGroup ?? 'Other'
      const movement = meta?.movementType ?? 'other'

      for (const set of block.sets ?? []) {
        const vol = (Number(set.weight) || 0) * (Number(set.reps) || 0)
        if (vol <= 0) continue

        volumeByMuscle.set(muscle, (volumeByMuscle.get(muscle) ?? 0) + vol)
        setsByMuscle.set(muscle, (setsByMuscle.get(muscle) ?? 0) + 1)

        if (movement in movementVolume) {
          movementVolume[movement] += vol
        }

        const prev = lastTrained.get(muscle) ?? 0
        if (day > prev) lastTrained.set(muscle, day)
      }
    }
  }

  const totalVolume = [...volumeByMuscle.values()].reduce((a, b) => a + b, 0)
  const avgVolume = volumeByMuscle.size > 0 ? totalVolume / volumeByMuscle.size : 0

  const heatMap = MUSCLE_GROUPS.map((muscle) => {
    const vol = volumeByMuscle.get(muscle) ?? 0
    const sets = setsByMuscle.get(muscle) ?? 0
    const pct = totalVolume > 0 ? Math.round((vol / totalVolume) * 100) : 0
    const intensity =
      avgVolume > 0 ? Math.min(100, Math.round((vol / avgVolume) * 50)) : vol > 0 ? 50 : 0

    const last = lastTrained.get(muscle)
    const daysSince = last
      ? Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24))
      : 999

    return { muscle, volume: vol, sets, pct, intensity, daysSince }
  }).sort((a, b) => b.volume - a.volume)

  const insights = []

  const undertrained = heatMap.filter(
    (m) => m.volume < avgVolume * 0.4 && m.volume >= 0 && totalVolume > 0
  )
  const overtrained = heatMap.filter((m) => m.volume > avgVolume * 1.8 && m.volume > 0)

  for (const m of undertrained.slice(0, 3)) {
    if (m.daysSince >= 7) {
      insights.push({
        type: 'undertrained',
        severity: 'warning',
        muscle: m.muscle,
        message: `${m.muscle} are receiving significantly less volume than your average muscle group${m.daysSince < 999 ? ` — last trained ${m.daysSince} days ago` : ''}.`,
      })
    }
  }

  for (const m of heatMap) {
    if (m.daysSince >= 9 && m.volume === 0) {
      insights.push({
        type: 'missing',
        severity: 'warning',
        muscle: m.muscle,
        message: `You have not trained ${m.muscle.toLowerCase()} directly in ${m.daysSince >= 999 ? 'over 2 weeks' : `${m.daysSince} days`}.`,
      })
    }
  }

  const pushPullRatio =
    movementVolume.pull > 0 ? movementVolume.push / movementVolume.pull : movementVolume.push > 0 ? 2 : 1

  if (pushPullRatio > 1.35 && movementVolume.push > 0) {
    insights.push({
      type: 'ratio',
      severity: 'caution',
      message: `Your push-to-pull ratio is ${pushPullRatio.toFixed(2)}:1 (slightly push-dominant). Add rows, pulldowns, or face pulls.`,
    })
  } else if (pushPullRatio < 0.75 && movementVolume.pull > 0) {
    insights.push({
      type: 'ratio',
      severity: 'caution',
      message: `Your pull-to-push ratio favors pulling (${(1 / pushPullRatio).toFixed(2)}:1). Ensure adequate pressing volume.`,
    })
  } else if (movementVolume.push > 0 && movementVolume.pull > 0) {
    insights.push({
      type: 'ratio',
      severity: 'positive',
      message: 'Push and pull volume are well balanced for shoulder health and posture.',
    })
  }

  if (overtrained.length > 0) {
    insights.push({
      type: 'overtrained',
      severity: 'caution',
      message: `${overtrained[0].muscle} volume is elevated. Monitor recovery and consider rotating emphasis.`,
    })
  }

  const chestVol = volumeByMuscle.get('Chest') ?? 0
  const rearVol = volumeByMuscle.get('Rear Delts') ?? 0
  if (chestVol > 0 && rearVol < chestVol * 0.25) {
    insights.push({
      type: 'imbalance',
      severity: 'warning',
      message: 'Rear delts are receiving significantly less volume than chest. Add face pulls or reverse flies.',
    })
  }

  const hamVol = volumeByMuscle.get('Hamstrings') ?? 0
  const quadVol = volumeByMuscle.get('Quads') ?? 0
  if (quadVol > 0 && hamVol < quadVol * 0.35) {
    insights.push({
      type: 'imbalance',
      severity: 'warning',
      message: 'Hamstrings are undertrained relative to quads. Include RDLs or leg curls.',
    })
  }

  const distribution = heatMap
    .filter((m) => m.pct > 0)
    .map((m) => ({ name: m.muscle, value: m.pct }))

  const balanceScore =
    totalVolume === 0
      ? 0
      : Math.max(
          0,
          100 -
            undertrained.length * 12 -
            (pushPullRatio > 1.5 || pushPullRatio < 0.65 ? 15 : 0)
        )

  return {
    heatMap,
    distribution,
    movementVolume,
    pushPullRatio: Math.round(pushPullRatio * 100) / 100,
    insights: insights.slice(0, 6),
    balanceScore: Math.round(balanceScore),
    totalVolume,
  }
}
