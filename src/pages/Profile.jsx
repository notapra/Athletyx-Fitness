import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  Scale,
  Target,
  Plus,
  Trash2,
  Settings,
  Flame,
  HardDrive,
} from 'lucide-react'
import { useApp } from '../hooks/useApp.js'
import { useAuth } from '../hooks/useAuth.js'
import Card from '../components/ui/Card.jsx'
import SettingsPage from './Settings.jsx'
import { getBodyweightTrend } from '../utils/insights.js'
import { getDashboardStats } from '../utils/calculations.js'
import { getTrainingStreak } from '../utils/date.js'

export default function Profile() {
  const { profile, updateProfile } = useAuth()
  const { sessions, bodyweight, goals, logBodyweight, deleteBodyweight, addGoal, toggleGoal } = useApp()

  const [showSettings, setShowSettings] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [fitnessGoal, setFitnessGoal] = useState(profile?.fitness_goal ?? '')
  const [constraintInput, setConstraintInput] = useState('')

  const stats = useMemo(() => getDashboardStats(sessions), [sessions])
  const streak = useMemo(() => getTrainingStreak(sessions), [sessions])
  const trend = useMemo(() => getBodyweightTrend(bodyweight), [bodyweight])

  const chartData = useMemo(() => {
    return [...bodyweight]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30)
      .map((e) => ({
        date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: e.weight,
      }))
  }, [bodyweight])

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />
  }

  const constraints = profile?.ai_preferences?.constraints ?? []

  async function handleSaveProfile() {
    const updates = {}
    if (username.trim()) updates.username = username.trim()
    if (fitnessGoal.trim()) updates.fitness_goal = fitnessGoal.trim()
    if (Object.keys(updates).length > 0) await updateProfile(updates)
  }

  async function handleAddConstraint(e) {
    e.preventDefault()
    const text = constraintInput.trim()
    if (!text) return
    const next = [...constraints, text]
    await updateProfile({
      ai_preferences: { ...(profile?.ai_preferences ?? {}), constraints: next },
    })
    setConstraintInput('')
  }

  async function handleRemoveConstraint(index) {
    const next = constraints.filter((_, i) => i !== index)
    await updateProfile({
      ai_preferences: { ...(profile?.ai_preferences ?? {}), constraints: next },
    })
  }

  function handleLogWeight(e) {
    e.preventDefault()
    const w = Number(weightInput)
    if (w <= 0) return
    logBodyweight(w)
    setWeightInput('')
  }

  function handleAddGoal(e) {
    e.preventDefault()
    if (!goalTitle.trim()) return
    addGoal({ title: goalTitle.trim(), target: goalTarget.trim() || null, completed: false })
    setGoalTitle('')
    setGoalTarget('')
  }

  const displayName = profile?.username || profile?.email?.split('@')[0] || 'Athlete'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="space-y-5 px-4 pt-6 pb-4">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-2xl font-bold text-zinc-950 shadow-xl">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-3xl object-cover" />
            ) : (
              initial
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{displayName}</h1>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
              <HardDrive className="h-3 w-3 text-emerald-400" />
              Saved on this device
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 text-zinc-400"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Display name"
            className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-white"
          />
          <button
            type="button"
            onClick={handleSaveProfile}
            className="rounded-2xl bg-emerald-500/20 px-4 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30"
          >
            Save
          </button>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
            Primary fitness goal
          </label>
          <input
            value={fitnessGoal}
            onChange={(e) => setFitnessGoal(e.target.value)}
            onBlur={handleSaveProfile}
            placeholder="e.g. Build muscle — upper body emphasis"
            className="w-full rounded-2xl border border-amber-500/20 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600"
          />
          <p className="mt-1 text-[10px] text-zinc-500">Used by Goal Guardian to keep IronCoach aligned</p>
        </div>
        <form onSubmit={handleAddConstraint} className="flex gap-2">
          <input
            value={constraintInput}
            onChange={(e) => setConstraintInput(e.target.value)}
            placeholder="Add constraint (e.g. No high-impact cardio)"
            className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-white"
          />
          <button
            type="submit"
            className="rounded-2xl bg-amber-500/20 px-4 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/30"
          >
            Add
          </button>
        </form>
        {constraints.length > 0 ? (
          <ul className="space-y-1">
            {constraints.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-300"
              >
                <span>{c}</span>
                <button type="button" onClick={() => handleRemoveConstraint(i)} className="text-red-400/70">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="!p-3 text-center">
          <Flame className="mx-auto h-4 w-4 text-orange-400" />
          <p className="mt-1 text-xl font-bold text-white">{streak}</p>
          <p className="text-[10px] text-zinc-500">streak</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className="text-xl font-bold text-white">{stats.totalWorkouts}</p>
          <p className="text-[10px] text-zinc-500">workouts</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className="text-xl font-bold text-white">{(stats.totalVolume / 1000).toFixed(0)}k</p>
          <p className="text-[10px] text-zinc-500">lbs vol</p>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Scale className="h-4 w-4 text-cyan-400" />
          Bodyweight
        </h2>
        <Card>
          {trend.change !== 0 ? (
            <p className="mb-3 text-xs text-zinc-400">
              Weekly trend:{' '}
              <span className={trend.trend === 'bulk' ? 'text-emerald-400' : 'text-amber-400'}>
                {trend.change > 0 ? '+' : ''}
                {trend.change} lbs
              </span>
            </p>
          ) : null}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} width={32} />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-6 text-center text-sm text-zinc-500">Log weight to see trends</p>
          )}
          <form onSubmit={handleLogWeight} className="mt-4 flex gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="Weight (lbs)"
              className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white"
            />
            <button
              type="submit"
              className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-zinc-950"
            >
              Log
            </button>
          </form>
          {bodyweight.length > 0 ? (
            <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto">
              {[...bodyweight]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-950/50 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-300">
                      {e.weight} lbs ·{' '}
                      {new Date(e.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteBodyweight(e.id)}
                      className="text-red-400/70"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Target className="h-4 w-4 text-violet-400" />
          Goals
        </h2>
        <Card>
          <form onSubmit={handleAddGoal} className="space-y-2">
            <input
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Goal title"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white"
            />
            <input
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="Target (optional)"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white"
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 py-3 text-sm font-semibold text-violet-200"
            >
              <Plus className="h-4 w-4" />
              Add goal
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {goals.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">No goals yet</p>
            ) : (
              goals.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => toggleGoal(g.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                      g.completed
                        ? 'border-emerald-500/30 bg-emerald-500/10 opacity-70'
                        : 'border-zinc-800 bg-zinc-950/50'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        g.completed ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'
                      }`}
                    >
                      {g.completed ? (
                        <span className="text-[10px] font-bold text-zinc-950">✓</span>
                      ) : null}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-medium ${g.completed ? 'line-through text-zinc-400' : 'text-white'}`}
                      >
                        {g.title}
                      </p>
                      {g.target ? <p className="text-xs text-zinc-500">{g.target}</p> : null}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Card>
      </section>

    </div>
  )
}
