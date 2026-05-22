import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useApp } from '../hooks/useApp.js'
import Card from '../components/ui/Card.jsx'
import {
  getVolumeOverTime,
  getWorkoutFrequency,
  getMuscleGroupDistribution,
  getPersonalRecords,
  getExerciseProgression,
} from '../utils/calculations.js'
import { EXERCISE_DATABASE } from '../data/exercises.js'

const CHART_COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#fb7185']

export default function Analytics() {
  const { sessions } = useApp()
  const [selectedExercise, setSelectedExercise] = useState('Bench Press')

  const volumeData = useMemo(() => getVolumeOverTime(sessions, 30), [sessions])
  const frequencyData = useMemo(() => getWorkoutFrequency(sessions, 8), [sessions])
  const muscleData = useMemo(() => getMuscleGroupDistribution(sessions), [sessions])
  const prs = useMemo(() => getPersonalRecords(sessions), [sessions])
  const progression = useMemo(
    () => getExerciseProgression(sessions, selectedExercise, 12),
    [sessions, selectedExercise]
  )

  const exercisedNames = useMemo(() => {
    const names = new Set()
    for (const s of sessions) {
      for (const block of s.exercises ?? []) {
        if (block.exercise) names.add(block.exercise)
      }
    }
    return [...names].sort()
  }, [sessions])

  return (
    <div className="space-y-5 px-4 pt-6 pb-4">
      <header>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-zinc-500">Progress, volume, and training patterns</p>
      </header>

      <ChartCard title="Volume over time (30 days)">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={volumeData}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} width={36} />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#34d399"
              fill="url(#volGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Workout frequency">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={frequencyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Exercise progression">
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="mb-3 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white"
        >
          {(exercisedNames.length ? exercisedNames : EXERCISE_DATABASE.slice(0, 8).map((e) => e.name)).map(
            (name) => (
              <option key={name} value={name}>
                {name}
              </option>
            )
          )}
        </select>
        {progression.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">No data for this exercise yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={progression}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                }
                tick={{ fontSize: 9 }}
              />
              <YAxis tick={{ fontSize: 9 }} width={36} />
              <Tooltip
                contentStyle={{
                  background: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(d) => new Date(d).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: '#a78bfa', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {muscleData.length > 0 ? (
        <ChartCard title="Muscle group distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={muscleData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
              >
                {muscleData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {muscleData.map((m, i) => (
              <span key={m.name} className="flex items-center gap-1 text-[10px] text-zinc-400">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                {m.name}
              </span>
            ))}
          </div>
        </ChartCard>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">PR history</h2>
        {prs.length === 0 ? (
          <Card className="text-center text-sm text-zinc-500">No PRs yet</Card>
        ) : (
          <div className="space-y-2">
            {prs.map((pr) => (
              <div
                key={pr.exerciseDisplay}
                className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <span className="text-sm font-medium text-white">{pr.exerciseDisplay}</span>
                <span className="font-bold text-emerald-400">{pr.weight} lbs</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <Card className="!p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      {children}
    </Card>
  )
}
