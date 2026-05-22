export default function PRCard({ exercise, weight }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-950 p-[1px] shadow-xl shadow-black/50 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/40">
      <div className="relative h-full rounded-[15px] bg-zinc-950/80 p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl transition-opacity group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-cyan-500/10 blur-3xl" />

        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
          Personal record
        </p>
        <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white sm:text-xl">
          {exercise}
        </h3>
        <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
          {weight}
          <span className="ml-1 text-base font-semibold text-zinc-500">lbs</span>
        </p>
        <p className="mt-2 text-xs text-zinc-500">Heaviest successful top set logged</p>
      </div>
    </div>
  )
}
