import {
  filterSessionsByDays,
  getConsecutiveTrainingDays,
  getTrainingDaysInWindow,
  clamp,
} from './aiHelpers.js'
import { getSessionVolume } from './session.js'
import { flattenSets } from './session.js'

function computeTrainingLoad(sessions, days) {
  const filtered = filterSessionsByDays(sessions, days)
  let load = 0
  for (const session of filtered) {
    const vol = getSessionVolume(session)
    const sets = flattenSets(session).length
    load += vol + sets * 50
  }
  return load
}

function computeAcuteChronicRatio(sessions) {
  const acute = computeTrainingLoad(sessions, 7)
  const chronic = computeTrainingLoad(sessions, 28) / 4
  if (chronic <= 0) return acute > 0 ? 1.2 : 1
  return acute / chronic
}

export function analyzeRecovery(sessions) {
  const load7 = computeTrainingLoad(sessions, 7)
  const load14 = computeTrainingLoad(sessions, 14)
  const load30 = computeTrainingLoad(sessions, 30)
  const acwr = computeAcuteChronicRatio(sessions)
  const consecutive = getConsecutiveTrainingDays(sessions)
  const days7 = getTrainingDaysInWindow(sessions, 7)
  const prevWeekLoad = load14 - load7
  const loadChangePct =
    prevWeekLoad > 0 ? Math.round(((load7 - prevWeekLoad) / prevWeekLoad) * 100) : 0

  let fatigue = 25
  fatigue += Math.min(30, consecutive * 6)
  fatigue += acwr > 1.3 ? 25 : acwr > 1.1 ? 15 : 0
  fatigue += days7 >= 6 ? 15 : days7 >= 5 ? 10 : 0
  fatigue += loadChangePct > 20 ? 15 : loadChangePct > 10 ? 8 : 0
  fatigue = clamp(fatigue, 0, 100)

  const recoveryScore = clamp(100 - fatigue + (days7 <= 3 ? 10 : 0), 0, 100)
  const readiness = clamp(recoveryScore - (acwr > 1.35 ? 15 : 0), 0, 100)

  let sleepMin = 7
  let sleepMax = 8
  if (load7 > 40000 || fatigue > 60) {
    sleepMin = 8
    sleepMax = 9
  } else if (load7 > 25000 || fatigue > 40) {
    sleepMin = 7.5
    sleepMax = 8.5
  } else if (fatigue < 25) {
    sleepMin = 7
    sleepMax = 8
  }

  const insights = []

  insights.push({
    type: 'sleep',
    message: `Your current workload suggests ${sleepMin}–${sleepMax} hours of sleep for optimal recovery.`,
  })

  if (consecutive >= 5) {
    insights.push({
      type: 'rest',
      severity: 'warning',
      message: `You trained hard ${consecutive} consecutive days. Consider a lighter recovery session or complete rest day.`,
    })
  } else if (consecutive >= 3 && fatigue > 50) {
    insights.push({
      type: 'rest',
      severity: 'caution',
      message: `${consecutive} consecutive training days with elevated fatigue. Monitor joint stress and sleep quality.`,
    })
  }

  if (loadChangePct > 10) {
    insights.push({
      type: 'load',
      message: `Recovery demand increased ${loadChangePct}% this week compared to the prior period.`,
    })
  } else if (loadChangePct < -10 && load7 > 0) {
    insights.push({
      type: 'load',
      message: `Training load decreased ${Math.abs(loadChangePct)}% — recovery capacity should be improving.`,
    })
  }

  if (acwr > 1.4) {
    insights.push({
      type: 'overtraining',
      severity: 'warning',
      message:
        'Acute training load is significantly above your recent baseline. Prioritize sleep, nutrition, and deload if performance drops.',
    })
  } else if (readiness >= 75) {
    insights.push({
      type: 'readiness',
      severity: 'positive',
      message: 'Recovery markers look strong. You are well-positioned for a productive training session.',
    })
  }

  if (days7 === 0) {
    insights.push({
      type: 'inactive',
      message: 'No sessions logged this week. Readiness is high — great time to return with a structured plan.',
    })
  }

  const readinessLabel =
    readiness >= 80 ? 'Optimal' : readiness >= 60 ? 'Good' : readiness >= 40 ? 'Moderate' : 'Low'

  const fatigueLabel =
    fatigue >= 70 ? 'High' : fatigue >= 45 ? 'Moderate' : fatigue >= 25 ? 'Mild' : 'Low'

  return {
    recoveryScore: Math.round(recoveryScore),
    fatigue: Math.round(fatigue),
    readiness: Math.round(readiness),
    readinessLabel,
    fatigueLabel,
    sleepRange: { min: sleepMin, max: sleepMax },
    acwr: Math.round(acwr * 100) / 100,
    consecutiveDays: consecutive,
    weeklySessions: days7,
    load7,
    load30,
    loadChangePct,
    insights,
  }
}
