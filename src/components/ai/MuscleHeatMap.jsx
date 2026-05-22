import { motion } from 'framer-motion'

export default function MuscleHeatMap({ heatMap }) {
  if (!heatMap?.length) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">Log workouts to generate muscle heat map</p>
    )
  }

  const maxIntensity = Math.max(...heatMap.map((m) => m.intensity), 1)

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {heatMap.map((m, i) => {
        const heat = m.intensity / maxIntensity
        const opacity = 0.15 + heat * 0.75
        return (
          <motion.div
            key={m.muscle}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="relative overflow-hidden rounded-2xl border border-zinc-800 p-3"
            style={{
              background: `rgba(52, 211, 153, ${opacity})`,
            }}
          >
            <p className="text-xs font-semibold text-white">{m.muscle}</p>
            <p className="mt-0.5 text-[10px] text-zinc-300">
              {m.pct > 0 ? `${m.pct}% vol` : 'No data'}
            </p>
            {m.daysSince < 999 ? (
              <p className="text-[9px] text-zinc-400">{m.daysSince}d ago</p>
            ) : null}
          </motion.div>
        )
      })}
    </div>
  )
}
