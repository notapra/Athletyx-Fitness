import { motion } from 'framer-motion'
import {
  estimateSubMuscle1RM,
  getMuscleTip,
  getRegionDisplayTip,
} from '../../utils/subMuscleAnalytics.js'

export default function MuscleTooltip({ muscle, sessions, position }) {
  if (!muscle) return null

  const isRegion = Array.isArray(muscle.subMuscleIds)
  const est1RM = isRegion
    ? null
    : estimateSubMuscle1RM(muscle.id, sessions)
  const tip = isRegion
    ? getRegionDisplayTip(muscle)
    : getMuscleTip(muscle, sessions)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-none absolute z-30 w-56 rounded-2xl border border-zinc-700/80 bg-zinc-950/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl"
      style={{
        left: position?.x ?? '50%',
        top: position?.y ?? 'auto',
        bottom: position?.y ? undefined : '100%',
        transform: position?.x ? 'translate(-50%, -110%)' : 'translate(-50%, -8px)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{muscle.label}</p>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
          style={{
            color: muscle.color,
            backgroundColor: `${muscle.color}22`,
            border: `1px solid ${muscle.color}44`,
          }}
        >
          {muscle.tierLabel}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        Strength score: <span className="font-semibold text-zinc-200">{muscle.score}/100</span>
      </p>
      {muscle.volume > 0 ? (
        <p className="text-xs text-zinc-500">
          30d volume: {Math.round(muscle.volume).toLocaleString()} lbs · {muscle.sets} sets
        </p>
      ) : (
        <p className="text-xs text-zinc-500">No volume in the last 30 days</p>
      )}
      {est1RM ? (
        <p className="mt-1 text-xs text-cyan-300/90">Est. top set: {est1RM} lbs</p>
      ) : null}
      <p className="mt-2 border-t border-zinc-800 pt-2 text-xs leading-relaxed text-emerald-200/85">
        {tip}
      </p>
    </motion.div>
  )
}
