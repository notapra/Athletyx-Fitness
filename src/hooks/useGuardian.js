/**
 * React hook: bundles analysis + goal contract + Guardian status for AI pages.
 * Memoizes runFullAnalysis to avoid recomputing features on unrelated renders.
 */

import { useMemo, useCallback } from 'react'
import { useAuth } from './useAuth.js'
import { useApp } from './useApp.js'
import { runFullAnalysis } from '../utils/aiAnalysis.js'
import { buildGoalContract } from '../utils/goalContract.js'
import { getGuardianStatus, runReminderTick } from '../services/guardianService.js'

export function useGuardian() {
  const { profile, userId } = useAuth()
  const { sessions, goals, workoutMode } = useApp()

  const analysis = useMemo(() => runFullAnalysis(sessions), [sessions])
  const contract = useMemo(
    () => buildGoalContract(profile, goals, sessions),
    [profile, goals, sessions]
  )
  const status = useMemo(
    () => getGuardianStatus(contract, sessions, analysis),
    [contract, sessions, analysis]
  )

  const tick = useCallback(() => {
    return runReminderTick({
      userId,
      profile,
      goals,
      sessions,
      workoutMode,
      analysis,
    })
  }, [userId, profile, goals, sessions, workoutMode, analysis])

  return { contract, analysis, status, tick }
}
