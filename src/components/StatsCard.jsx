import Card from './ui/Card.jsx'

export default function StatsCard({ label, value, hint, icon, delay = 0 }) {
  return (
    <Card delay={delay} className="group">
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
          {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 text-emerald-400">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
