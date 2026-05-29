import { useMemo } from 'react'
import { useApp } from './useApp.js'
import { runFullAnalysis } from '../utils/aiAnalysis.js'
import {
  buildMuscleScoreboard,
  getCoachIslandInsight,
  getIslandSummary,
  getRegionGrid,
  getSubMuscleImbalances,
} from '../utils/subMuscleAnalytics.js'

export function useMuscleAnalytics(options = {}) {
  const { days = 30 } = options
  const { sessions, activeSession } = useApp()

  const includeActive = activeSession ?? null

  const board = useMemo(
    () => buildMuscleScoreboard(sessions, { days, includeActiveSession: includeActive }),
    [sessions, days, includeActive]
  )

  const analysis = useMemo(() => runFullAnalysis(sessions), [sessions])

  const imbalances = useMemo(
    () => getSubMuscleImbalances(board.muscles),
    [board.muscles]
  )

  const islandSummary = useMemo(
    () => getIslandSummary(board.muscles, board.todayMap),
    [board.muscles, board.todayMap]
  )

  const coachInsight = useMemo(
    () => getCoachIslandInsight(board.muscles, analysis, imbalances),
    [board.muscles, analysis, imbalances]
  )

  const regionGrid = useMemo(() => getRegionGrid(board.muscles), [board.muscles])

  const muscleById = useMemo(
    () => Object.fromEntries(board.muscles.map((m) => [m.id, m])),
    [board.muscles]
  )

  return {
    muscles: board.muscles,
    muscleById,
    volumeMap: board.volumeMap,
    todayMap: board.todayMap,
    scores: board.scores,
    imbalances,
    islandSummary,
    coachInsight,
    regionGrid,
    analysis,
  }
}
