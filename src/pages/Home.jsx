import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Flame,
  TrendingUp,
  Trophy,
  Play,
  Target,
  Dumbbell,
  Zap,
} from 'lucide-react'
import { useApp } from '../hooks/useApp.js'
import PRCard from '../components/PRCard.jsx'
import SessionCard from '../components/SessionCard.jsx'
import {
  getDashboardStats,
  getLastNDaysVolume,
  getPersonalRecords,
  getWeeklyVolume,
} from '../utils/calculations.js'
import { getTrainingStreak, trainedToday } from '../utils/date.js'
import { getProgressiveOverloadSuggestions, getTrainingInsights } from '../utils/insights.js'
import GuardianReminder from '../components/ai/GuardianReminder.jsx'
import AnatomicalBodyMap from '../components/body/AnatomicalBodyMap.jsx'
import Card from '../components/ui/Card.jsx'
import { useGuardian } from '../hooks/useGuardian.js'
import { useMuscleAnalytics } from '../hooks/useMuscleAnalytics.js'

export default function Home({ onStartWorkout }) {
  const { sessions, goals, startWorkout, guardianReminder, dismissGuardianReminder, setGuardianReminder } =
    useApp()
  const { tick } = useGuardian()

  useEffect(() => {
    const { reminder } = tick()
    if (reminder) setGuardianReminder(reminder)
  }, [tick, setGuardianReminder])

  const streak = useMemo(() => getTrainingStreak(sessions), [sessions])
  const didTrainToday = useMemo(() => trainedToday(sessions), [sessions])
  const stats = useMemo(() => getDashboardStats(sessions), [sessions])
  const prs = useMemo(() => getPersonalRecords(sessions), [sessions])
  const weekVolume = useMemo(() => getWeeklyVolume(sessions), [sessions])
  const weekData = useMemo(() => getLastNDaysVolume(sessions, 7), [sessions])
  const weekKeys = Object.keys(weekData)
  const weekMax = Math.max(1, ...Object.values(weekData))
  const recent = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3),
    [sessions]
  )
  const insights = useMemo(() => getTrainingInsights(sessions), [sessions])
  const suggestions = useMemo(() => getProgressiveOverloadSuggestions(sessions), [sessions])
  const activeGoals = goals.filter((g) => !g.completed).slice(0, 2)
  const { muscles, muscleById } = useMuscleAnalytics({ days: 30 })

  function handleQuickStart() {
    if (onStartWorkout) onStartWorkout()
    else startWorkout('Upper')
  }

  return (
    <div className="space-y-5 px-4 pt-2 pb-4">
      <GuardianReminder reminder={guardianReminder} onDismiss={dismissGuardianReminder} />

      <section>
        <h2 className="mb-1 text-sm font-semibold text-white">Muscle development map</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Tap a region for strength tier, volume, and AI cues.
        </p>
        <Card className="!p-4">
          <AnatomicalBodyMap muscles={muscles} muscleById={muscleById} />
        </Card>
      </section>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
          IronLog
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          {didTrainToday ? 'Great session today' : 'Ready to train?'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Your strength journey, beautifully tracked.</p>
      </header>

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={handleQuickStart}
        className="flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400 p-5 shadow-2xl shadow-emerald-500/25"
      >
        <div className="text-left">
          <p className="text-sm font-bold text-zinc-950/70">Quick start</p>
          <p className="text-xl font-bold text-zinc-950">Start workout</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950/20">
          <Play className="h-6 w-6 fill-zinc-950 text-zinc-950" />
        </div>
      </motion.button>

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <p className="text-[10px] font-semibold uppercase text-zinc-500">Streak</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{streak}</p>
          <p className="text-xs text-zinc-500">training days</p>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            <p className="text-[10px] font-semibold uppercase text-zinc-500">This week</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{(weekVolume / 1000).toFixed(1)}k</p>
          <p className="text-xs text-zinc-500">lbs volume</p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">7-day load</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              didTrainToday ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
            }`}
          >
            {didTrainToday ? 'Active today' : 'Rest day?'}
          </span>
        </div>
        <div className="flex h-28 items-end gap-1.5">
          {weekKeys.map((key) => {
            const v = weekData[key]
            const h = Math.max(8, Math.round((v / weekMax) * 100))
            const day = new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'narrow',
            })
            return (
              <div key={key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-8 rounded-t-lg bg-gradient-to-t from-emerald-600/30 to-emerald-400/80 transition-all duration-500"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] font-semibold text-zinc-600">{day}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {insights.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Zap className="h-4 w-4 text-amber-400" />
            Training insights
          </h2>
          <div className="space-y-2">
            {insights.map((item, i) => (
              <Card key={i} className="!p-3 !rounded-2xl">
                <p className="text-sm text-zinc-300">{item.message}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {suggestions.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-white">Progressive overload</h2>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100/90"
              >
                {s.message}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeGoals.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Target className="h-4 w-4 text-violet-400" />
            Active goals
          </h2>
          {activeGoals.map((g) => (
            <Card key={g.id} className="mb-2 !p-3 !rounded-2xl">
              <p className="font-medium text-white">{g.title}</p>
              {g.target ? <p className="text-xs text-zinc-500">Target: {g.target}</p> : null}
            </Card>
          ))}
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Trophy className="h-4 w-4 text-amber-400" />
            Latest PRs
          </h2>
          <span className="text-xs text-zinc-500">{prs.length} lifts</span>
        </div>
        {prs.length === 0 ? (
          <Card className="text-center text-sm text-zinc-500">Log workouts to unlock PRs</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {prs.slice(0, 4).map((pr) => (
              <PRCard key={pr.exerciseDisplay} exercise={pr.exerciseDisplay} weight={pr.weight} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Dumbbell className="h-4 w-4 text-emerald-400" />
            Recent workouts
          </h2>
          <span className="text-xs text-zinc-500">{stats.totalWorkouts} total</span>
        </div>
        {recent.length === 0 ? (
          <Card className="text-center text-sm text-zinc-500">
            No workouts yet. Tap Start workout above.
          </Card>
        ) : (
          <div className="space-y-3">
            {recent.map((s, i) => (
              <SessionCard key={s.id} session={s} delay={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
