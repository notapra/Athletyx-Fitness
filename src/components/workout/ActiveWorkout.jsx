import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Copy,
  Trash2,
  Check,
  ChevronDown,
  Timer,
  X,
} from 'lucide-react'
import { filterExerciseSuggestions, WORKOUT_SPLITS } from '../../data/exercises.js'
import {
  createEmptyExercise,
  createEmptySet,
  formatDuration,
  getSessionVolume,
} from '../../utils/session.js'
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer.js'
import RestTimer from './RestTimer.jsx'

export default function ActiveWorkout({
  session,
  onUpdate,
  onFinish,
  onCancel,
  restTimer,
}) {
  const [expandedIdx, setExpandedIdx] = useState(0)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [split, setSplit] = useState(session.split ?? 'Upper')
  const [notes, setNotes] = useState(session.notes ?? '')

  const elapsed = useWorkoutTimer(session.startedAt, true)
  const suggestions = useMemo(
    () => filterExerciseSuggestions(exerciseQuery, 10),
    [exerciseQuery]
  )

  const volume = getSessionVolume(session)

  function updateSession(patch) {
    onUpdate({ ...session, ...patch })
  }

  function updateExercise(idx, block) {
    const exercises = [...(session.exercises ?? [])]
    exercises[idx] = block
    updateSession({ exercises, split, notes })
  }

  function addExercise(name = '') {
    const exercises = [...(session.exercises ?? []), createEmptyExercise(name)]
    updateSession({ exercises, split, notes })
    setExpandedIdx(exercises.length - 1)
    setShowExercisePicker(false)
    setExerciseQuery('')
  }

  function removeExercise(idx) {
    const exercises = (session.exercises ?? []).filter((_, i) => i !== idx)
    updateSession({ exercises, split, notes })
    setExpandedIdx(Math.max(0, idx - 1))
  }

  function addSet(exIdx, duplicate = false) {
    const block = session.exercises[exIdx]
    const last = block.sets[block.sets.length - 1]
    const newSet = duplicate && last ? createEmptySet(last) : createEmptySet()
    updateExercise(exIdx, { ...block, sets: [...block.sets, newSet] })
    restTimer.start(90)
  }

  function updateSet(exIdx, setIdx, field, value) {
    const block = session.exercises[exIdx]
    const sets = block.sets.map((s, i) =>
      i === setIdx ? { ...s, [field]: value } : s
    )
    updateExercise(exIdx, { ...block, sets })
  }

  function removeSet(exIdx, setIdx) {
    const block = session.exercises[exIdx]
    const sets = block.sets.filter((_, i) => i !== setIdx)
    updateExercise(exIdx, { ...block, sets: sets.length ? sets : [createEmptySet()] })
  }

  function handleFinish() {
    onFinish({
      ...session,
      split,
      notes,
      duration: elapsed,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <header className="safe-top flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 text-zinc-400"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
            Live workout
          </p>
          <p className="text-xl font-bold tabular-nums text-white">{formatDuration(elapsed)}</p>
        </div>
        <button
          type="button"
          onClick={handleFinish}
          className="flex h-10 items-center gap-1.5 rounded-2xl bg-emerald-500 px-3 text-sm font-bold text-zinc-950"
        >
          <Check className="h-4 w-4" />
          Finish
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {WORKOUT_SPLITS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSplit(s)
                updateSession({ split: s })
              }}
              className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                split === s
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'border border-zinc-800 text-zinc-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-[10px] uppercase text-zinc-500">Volume</p>
            <p className="text-lg font-bold text-white">{volume.toLocaleString()} lbs</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-[10px] uppercase text-zinc-500">Exercises</p>
            <p className="text-lg font-bold text-white">{session.exercises?.length ?? 0}</p>
          </div>
        </div>

        <AnimatePresence>
          {(session.exercises ?? []).map((block, exIdx) => {
            const open = expandedIdx === exIdx
            return (
              <motion.div
                key={`${block.exercise}-${exIdx}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIdx(open ? -1 : exIdx)}
                  className="flex w-full items-center justify-between p-4"
                >
                  <div className="text-left">
                    <p className="font-semibold text-white">{block.exercise || 'Exercise'}</p>
                    <p className="text-xs text-zinc-500">{block.sets.length} sets</p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-zinc-500 transition ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {open ? (
                  <div className="border-t border-zinc-800 px-4 pb-4">
                    <div className="mb-2 grid grid-cols-[1fr_1fr_40px_40px] gap-2 text-[10px] font-semibold uppercase text-zinc-500">
                      <span>lbs</span>
                      <span>reps</span>
                      <span />
                      <span />
                    </div>
                    {block.sets.map((set, setIdx) => (
                      <div
                        key={setIdx}
                        className="mb-2 grid grid-cols-[1fr_1fr_40px_40px] gap-2"
                      >
                        <input
                          inputMode="decimal"
                          type="number"
                          placeholder="0"
                          value={set.weight}
                          onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-center text-sm font-semibold text-white"
                        />
                        <input
                          inputMode="numeric"
                          type="number"
                          placeholder="0"
                          value={set.reps}
                          onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-center text-sm font-semibold text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            addSet(exIdx, true)
                          }}
                          className="flex items-center justify-center rounded-xl border border-zinc-700 text-zinc-400"
                          title="Duplicate set"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSet(exIdx, setIdx)}
                          className="flex items-center justify-center rounded-xl border border-red-500/30 text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => addSet(exIdx)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-300"
                      >
                        <Plus className="h-4 w-4" />
                        Add set
                      </button>
                      <button
                        type="button"
                        onClick={() => restTimer.start(90)}
                        className="flex items-center justify-center gap-1 rounded-2xl border border-zinc-700 px-4 py-2.5 text-xs font-semibold text-zinc-300"
                      >
                        <Timer className="h-4 w-4" />
                        Rest
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExercise(exIdx)}
                        className="rounded-2xl border border-red-500/30 px-3 text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {showExercisePicker ? (
          <div className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
            <input
              autoFocus
              value={exerciseQuery}
              onChange={(e) => setExerciseQuery(e.target.value)}
              placeholder="Search exercises..."
              className="mb-3 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white"
            />
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {suggestions.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => addExercise(name)}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-emerald-500/10"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            updateSession({ notes: e.target.value })
          }}
          placeholder="Session notes..."
          rows={2}
          className="mb-24 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600"
        />
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowExercisePicker(true)}
        className="safe-bottom fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-zinc-950 shadow-2xl shadow-emerald-500/30"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </motion.button>

      <RestTimer timer={restTimer} />
    </div>
  )
}
