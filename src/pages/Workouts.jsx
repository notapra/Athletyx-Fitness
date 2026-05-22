import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { useApp } from '../hooks/useApp.js'
import SessionCard from '../components/SessionCard.jsx'
import Modal from '../components/ui/Modal.jsx'
import { WORKOUT_SPLITS } from '../data/exercises.js'
import { getSessionVolume, getSessionSetCount } from '../utils/session.js'
import { formatLongDate } from '../utils/date.js'

export default function Workouts({ onStartWorkout }) {
  const { sessions, deleteSession, startWorkout } = useApp()
  const [query, setQuery] = useState('')
  const [split, setSplit] = useState('all')
  const [selected, setSelected] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sessions
      .filter((s) => {
        const matchesSplit = split === 'all' || s.split === split
        const matchesQuery =
          !q ||
          s.split?.toLowerCase().includes(q) ||
          (s.exercises ?? []).some((e) => e.exercise.toLowerCase().includes(q))
        return matchesSplit && matchesQuery
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [sessions, query, split])

  function handleStart() {
    if (onStartWorkout) onStartWorkout()
    else startWorkout('Upper')
  }

  return (
    <div className="space-y-4 px-4 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workouts</h1>
          <p className="text-sm text-zinc-500">{sessions.length} sessions logged</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          className="flex h-11 items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 text-sm font-bold text-zinc-950"
        >
          <Plus className="h-4 w-4" />
          New
        </motion.button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises or splits..."
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <FilterChip active={split === 'all'} onClick={() => setSplit('all')} label="All" />
        {WORKOUT_SPLITS.map((s) => (
          <FilterChip key={s} active={split === s} onClick={() => setSplit(s)} label={s} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          {sessions.length === 0
            ? 'Start your first workout session.'
            : 'No sessions match your filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => (
            <SessionCard
              key={s.id}
              session={s}
              delay={i}
              onClick={() => setSelected(s)}
              onDelete={(id) => setPendingDelete(id)}
            />
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Session details">
        {selected ? <SessionDetail session={selected} /> : null}
      </Modal>

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete session?">
        <p className="text-sm text-zinc-400">This cannot be undone.</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setPendingDelete(null)}
            className="flex-1 rounded-2xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              deleteSession(pendingDelete)
              setPendingDelete(null)
              setSelected(null)
            }}
            className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold transition ${
        active
          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
          : 'border border-zinc-800 text-zinc-400'
      }`}
    >
      {label}
    </button>
  )
}

function SessionDetail({ session }) {
  const volume = getSessionVolume(session)
  const sets = getSessionSetCount(session)

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">{formatLongDate(session.date)}</p>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl border border-zinc-800 p-3">
          <p className="text-lg font-bold text-white">{volume.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">volume (lbs)</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 p-3">
          <p className="text-lg font-bold text-white">{sets}</p>
          <p className="text-xs text-zinc-500">sets</p>
        </div>
      </div>
      <ul className="space-y-3">
        {(session.exercises ?? []).map((block, i) => (
          <li key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="font-semibold text-white">{block.exercise}</p>
            <div className="mt-2 space-y-1">
              {block.sets.map((set, j) => (
                <p key={j} className="text-sm text-zinc-400">
                  Set {j + 1}: {set.weight} lbs × {set.reps} reps
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {session.notes ? (
        <p className="text-sm italic text-zinc-500">"{session.notes}"</p>
      ) : null}
    </div>
  )
}
