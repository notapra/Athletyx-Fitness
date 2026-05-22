import { useMemo, useState } from 'react'
import { filterExerciseSuggestions, WORKOUT_SPLITS } from '../data/exercises.js'

export default function WorkoutForm({
  editingWorkout,
  onCancelEdit,
  onSave,
}) {
  const [exercise, setExercise] = useState(() =>
    editingWorkout?.exercise != null ? String(editingWorkout.exercise).trim() : ''
  )
  const [weight, setWeight] = useState(() =>
    editingWorkout?.weight !== undefined ? String(editingWorkout.weight) : ''
  )
  const [reps, setReps] = useState(() =>
    editingWorkout?.reps !== undefined ? String(editingWorkout.reps) : ''
  )
  const [sets, setSets] = useState(() =>
    editingWorkout?.sets !== undefined ? String(editingWorkout.sets) : ''
  )
  const [split, setSplit] = useState(() => editingWorkout?.split ?? 'Upper')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = useMemo(() => filterExerciseSuggestions(exercise, 8), [exercise])

  const disabled =
    !exercise.trim() ||
    Number(weight) <= 0 ||
    Number(reps) <= 0 ||
    Number(sets) <= 0

  function submit(e) {
    e.preventDefault()
    if (disabled) return

    const payload = {
      exercise: exercise.trim(),
      weight: Number(weight),
      reps: Number(reps),
      sets: Number(sets),
      split,
      date: editingWorkout?.date ?? new Date().toISOString(),
    }

    onSave(payload, editingWorkout?.id ?? null)

    if (!editingWorkout) {
      setExercise('')
      setWeight('')
      setReps('')
      setSets('')
      setSplit('Upper')
    }

    setShowSuggestions(false)
  }

  return (
    <section
      id="log-form"
      className="scroll-mt-28 rounded-3xl border border-zinc-800 bg-zinc-900/45 p-5 shadow-xl shadow-black/40 backdrop-blur-xl sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {editingWorkout ? 'Update workout' : 'Log a workout'}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Capture your working weights with intent — your PRs and volume analytics update instantly.
          </p>
        </div>
        {editingWorkout ? (
          <button
            type="button"
            onClick={() => {
              setShowSuggestions(false)
              onCancelEdit()
            }}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-200 transition-all duration-300 hover:border-zinc-500"
          >
            Cancel edit
          </button>
        ) : null}
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="relative lg:col-span-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Exercise
          </label>
          <input
            type="text"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 120)
            }}
            autoComplete="off"
            placeholder="e.g. Trap-bar deadlift"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/30 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
          {showSuggestions && suggestions.length > 0 ? (
            <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 py-1 text-sm shadow-2xl shadow-black/60 backdrop-blur-xl">
              {suggestions.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="flex w-full items-center px-3 py-2 text-left text-zinc-200 transition-colors hover:bg-emerald-500/15"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setExercise(name)
                      setShowSuggestions(false)
                    }}
                  >
                    <span className="mr-2 text-emerald-400/85">⌁</span>
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Weight (lbs)
          </label>
          <input
            inputMode="decimal"
            type="number"
            min={0}
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/30 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Reps
          </label>
          <input
            inputMode="numeric"
            type="number"
            min={1}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/30 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Sets
          </label>
          <input
            inputMode="numeric"
            type="number"
            min={1}
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/30 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Split
          </label>
          <select
            value={split}
            onChange={(e) => setSplit(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/30 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          >
            {WORKOUT_SPLITS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-12 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all duration-300 enabled:hover:scale-[1.02] enabled:hover:shadow-emerald-400/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editingWorkout ? 'Save changes' : 'Log workout'}
          </button>
          {!editingWorkout ? (
            <p className="text-xs text-zinc-500 sm:flex-1 sm:text-right">
              Volume auto-calculated as Weight × Reps × Sets for analytics.
            </p>
          ) : (
            <p className="text-xs text-emerald-200/75 sm:flex-1 sm:text-right">
              Editing preserves the original log timestamp unless you change it externally.
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
