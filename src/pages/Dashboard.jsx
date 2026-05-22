import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import WorkoutForm from '../components/WorkoutForm.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'
import PRCard from '../components/PRCard.jsx'
import StatsCard from '../components/StatsCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { loadWorkouts, saveWorkouts } from '../utils/storage.js'
import {
  getDashboardStats,
  getLastNDaysVolume,
  getPersonalRecords,
} from '../utils/calculations.js'
import { formatRelativeLabel, getTrainingStreak, trainedToday } from '../utils/date.js'

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `w-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function Dashboard() {
  const [workouts, setWorkouts] = useState(() => loadWorkouts())
  const [query, setQuery] = useState('')
  const [split, setSplit] = useState('all')
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  useEffect(() => {
    saveWorkouts(workouts)
  }, [workouts])

  const streak = useMemo(() => getTrainingStreak(workouts), [workouts])
  const didTrainToday = useMemo(() => trainedToday(workouts), [workouts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return workouts.filter((w) => {
      const matchesSplit = split === 'all' || w.split === split
      const matchesQuery = !q || String(w.exercise).toLowerCase().includes(q)
      return matchesSplit && matchesQuery
    })
  }, [workouts, query, split])

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [filtered])

  const recent = useMemo(() => {
    return [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
  }, [workouts])

  const stats = useMemo(() => getDashboardStats(workouts), [workouts])
  const prs = useMemo(() => getPersonalRecords(workouts), [workouts])

  const weekVolume = useMemo(() => getLastNDaysVolume(workouts, 7), [workouts])
  const weekKeys = useMemo(() => Object.keys(weekVolume), [weekVolume])
  const weekMax = useMemo(() => {
    const vals = Object.values(weekVolume)
    return Math.max(1, ...vals)
  }, [weekVolume])

  function handleSave(payload, existingId) {
    if (existingId) {
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === existingId
            ? {
                ...w,
                ...payload,
              }
            : w
        )
      )
      setEditing(null)
      return
    }

    const next = {
      id: createId(),
      ...payload,
      date: new Date().toISOString(),
    }
    setWorkouts((prev) => [next, ...prev])
  }

  function requestDelete(id) {
    const w = workouts.find((x) => x.id === id)
    if (!w) return
    setPendingDelete(w)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    setWorkouts((prev) => prev.filter((w) => w.id !== pendingDelete.id))
    if (editing?.id === pendingDelete.id) setEditing(null)
    setPendingDelete(null)
  }

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-[-80px] top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <Navbar streak={streak} />

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 md:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            label="Total workouts"
            value={stats.totalWorkouts.toLocaleString()}
            hint="Every log counts toward your story."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M7 4h10v5H7V4zM5 10h14v10H5V10z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <StatsCard
            label="Total sets"
            value={stats.totalSets.toLocaleString()}
            hint="Volume-friendly consistency wins."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 19h14M7 5h10M8 9h8M8 13h8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <StatsCard
            label="Training volume"
            value={`${stats.totalVolume.toLocaleString()} lbs`}
            hint="Σ (weight × reps × sets)"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 20h12M8 16h8M10 12h4M9 4h6l1 4H8l1-4z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <StatsCard
            label="Most trained lift"
            value={stats.mostTrainedExercise}
            hint="Frequency — not necessarily your PR lift."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3v3M12 18v3M4.2 7.2l2.1 2.1M17.7 14.7l2.1 2.1M3 12h3M18 12h3M4.2 16.8l2.1-2.1M17.7 9.3l2.1-2.1"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            }
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">7-day load</h2>
                <p className="text-sm text-zinc-500">Training volume trend (lbs) — keep the bar moving.</p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  didTrainToday
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                }`}
              >
                {didTrainToday ? 'Checked in today' : 'No entry today'}
              </span>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
              <div className="flex h-40 items-end justify-between gap-2 sm:h-44">
                {weekKeys.map((key) => {
                  const v = weekVolume[key]
                  const h = Math.round((v / weekMax) * 100)
                  const label = new Date(`${key}T12:00:00`)
                  const day = label.toLocaleDateString(undefined, { weekday: 'short' })

                  return (
                    <div key={key} className="flex flex-1 flex-col items-center gap-2">
                      <div className="relative flex h-32 w-full items-end justify-center sm:h-36">
                        <div
                          className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-emerald-500/15 to-emerald-400/70 ring-1 ring-emerald-300/20 transition-all duration-500"
                          style={{ height: `${Math.max(8, h)}%` }}
                          title={`${v.toLocaleString()} lbs`}
                        />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {day}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">Recent activity</h3>
                <span className="text-xs text-zinc-500">Last 5 logs</span>
              </div>
              <ul className="mt-4 space-y-3">
                {recent.length === 0 ? (
                  <li className="text-sm text-zinc-500">Nothing here yet — your next PR starts with one set.</li>
                ) : (
                  recent.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-3 transition-colors hover:border-zinc-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{w.exercise}</p>
                        <p className="text-xs text-zinc-500">
                          {w.weight}×{w.reps}×{w.sets} · {w.split}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-emerald-300/90">
                        {formatRelativeLabel(w.date)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Personal records</h2>
                <p className="text-sm text-zinc-500">Auto-detected from your heaviest successful weights.</p>
              </div>
              <p className="text-xs text-zinc-600">
                {prs.length === 0 ? 'Log lifts to unlock PR cards.' : `${prs.length} tracked lifts`}
              </p>
            </div>

            {prs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/35 p-8 text-center text-sm text-zinc-500">
                Progressive overload shines when every heavy set is remembered. Bench it. Squat it. Pull it — we will
                handle the leaderboard.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {prs.slice(0, 6).map((pr) => (
                  <PRCard key={`${pr.exerciseDisplay}-${pr.weight}`} exercise={pr.exerciseDisplay} weight={pr.weight} />
                ))}
              </div>
            )}
          </div>
        </section>

        <WorkoutForm
          key={editing?.id ?? 'create'}
          editingWorkout={editing}
          onCancelEdit={() => setEditing(null)}
          onSave={handleSave}
        />

        <section className="space-y-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Workout history</h2>
              <p className="text-sm text-zinc-500">
                Showing {sortedFiltered.length} of {workouts.length}{' '}
                {workouts.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          </div>

          <SearchBar query={query} onQueryChange={setQuery} split={split} onSplitChange={setSplit} />

          {sortedFiltered.length === 0 ? (
            workouts.length === 0 ? (
              <EmptyState onAction={() => document.getElementById('log-form')?.scrollIntoView({ behavior: 'smooth' })} />
            ) : (
              <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/35 p-10 text-center text-sm text-zinc-400">
                No workouts match this filter — tweak search or reset the split dropdown.
              </div>
            )
          ) : (
            <div className="grid gap-4 lg:gap-5">
              {sortedFiltered.map((w, idx) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  styleDelay={idx * 35}
                  onEdit={(item) => {
                    setEditing(item)
                    document.getElementById('log-form')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  onDelete={requestDelete}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-zinc-900 pb-16 pt-8 text-center text-xs text-zinc-600">
          Built for lifters · Data stays on-device via{' '}
          <span className="text-zinc-500">localStorage</span>. Clear site data = clear logs.
        </footer>
      </main>

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-10 backdrop-blur-sm sm:items-center sm:pb-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-md animate-fade-up rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-2xl shadow-black/70"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/35 bg-red-500/15 text-red-200">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 9v6M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9zM12 8h.01"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 id="delete-title" className="text-lg font-semibold text-white">
                  Delete workout?
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  This removes{' '}
                  <span className="font-semibold text-white">{pendingDelete.exercise}</span> from your log. This cannot
                  be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600"
                onClick={() => setPendingDelete(null)}
              >
                Keep workout
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:brightness-105"
                onClick={confirmDelete}
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
