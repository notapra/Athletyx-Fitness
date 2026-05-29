import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BACK_BODY_OUTLINE,
  BODY_VIEWBOX,
  FRONT_BODY_OUTLINE,
  getPathsForView,
} from './bodyPaths.js'
import { TIER_COLORS } from '../../utils/subMuscleAnalytics.js'
import MuscleTooltip from './MuscleTooltip.jsx'
import { useApp } from '../../hooks/useApp.js'

const LEGEND = [
  { tier: 'neglected', label: 'Needs improvement', color: TIER_COLORS.neglected },
  { tier: 'intermediate', label: 'Intermediate', color: TIER_COLORS.intermediate },
  { tier: 'strong', label: 'Strong', color: TIER_COLORS.strong },
  { tier: 'elite', label: 'Elite', color: TIER_COLORS.elite },
]

export default function AnatomicalBodyMap({ muscles, muscleById }) {
  const { sessions } = useApp()
  const [view, setView] = useState('front')
  const [activeId, setActiveId] = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)

  const paths = useMemo(() => getPathsForView(view), [view])
  const outline = view === 'back' ? BACK_BODY_OUTLINE : FRONT_BODY_OUTLINE

  const handleMuscleEnter = useCallback((id, e) => {
    setActiveId(id)
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect()
    const target = e.currentTarget.getBoundingClientRect()
    if (rect) {
      setTooltipPos({
        x: target.left - rect.left + target.width / 2,
        y: target.top - rect.top,
      })
    }
  }, [])

  const handleMuscleLeave = useCallback(() => {
    setActiveId(null)
    setTooltipPos(null)
  }, [])

  const activeMuscle = activeId ? muscleById[activeId] : null

  return (
    <div className="relative">
      <div className="mb-4 flex rounded-2xl border border-zinc-800 bg-zinc-900/50 p-1">
        {['front', 'back'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setView(v)
              setActiveId(null)
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition ${
              view === v
                ? 'bg-zinc-800 text-white shadow-inner'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="relative mx-auto max-w-[220px]">
        <svg
          viewBox={BODY_VIEWBOX}
          className="h-auto w-full"
          role="img"
          aria-label={`${view} body muscle development map`}
        >
          <path
            d={outline}
            fill="#18181b"
            stroke="#3f3f46"
            strokeWidth="1.5"
            opacity="0.9"
          />
          {Object.entries(paths).map(([id, d]) => {
            const data = muscleById[id]
            const fill = data?.color ?? TIER_COLORS.neglected
            const isActive = activeId === id
            return (
              <motion.path
                key={id}
                d={d}
                fill={fill}
                fillOpacity={isActive ? 0.95 : 0.82}
                stroke={isActive ? '#fff' : '#27272a'}
                strokeWidth={isActive ? 1.5 : 0.75}
                className="cursor-pointer transition-colors"
                aria-label={data?.label ?? id}
                onMouseEnter={(e) => handleMuscleEnter(id, e)}
                onMouseLeave={handleMuscleLeave}
                onClick={(e) => handleMuscleEnter(id, e)}
                whileHover={{ scale: 1.02 }}
                style={{ transformOrigin: 'center' }}
              />
            )
          })}
        </svg>

        {activeMuscle && tooltipPos ? (
          <MuscleTooltip muscle={activeMuscle} sessions={sessions} position={tooltipPos} />
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LEGEND.map((item) => (
          <div
            key={item.tier}
            className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
