import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BACK_BODY_OUTLINE,
  BODY_VIEWBOX,
  FRONT_BODY_OUTLINE,
  getRegionsForView,
} from './bodyPaths.js'
import {
  TIER_COLORS,
  aggregateRegionMuscle,
} from '../../utils/subMuscleAnalytics.js'
import MuscleTooltip from './MuscleTooltip.jsx'
import { useApp } from '../../hooks/useApp.js'

const LEGEND = [
  { tier: 'neglected', label: 'Needs work', color: TIER_COLORS.neglected },
  { tier: 'intermediate', label: 'Building', color: TIER_COLORS.intermediate },
  { tier: 'strong', label: 'Strong', color: TIER_COLORS.strong },
  { tier: 'elite', label: 'Elite', color: TIER_COLORS.elite },
]

/** Head overlay — separate from muscle regions for a more human read. */
const HEAD_PATH =
  'M 100 8 C 81 8 69 22 69 37 C 69 50 78 58 88 61 L 112 61 C 122 58 131 50 131 37 C 131 22 119 8 100 8 Z'

export default function AnatomicalBodyMap({ muscles: _muscles, muscleById }) {
  const { sessions } = useApp()
  const [view, setView] = useState('front')
  const [activeId, setActiveId] = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)

  const regions = useMemo(() => getRegionsForView(view), [view])
  const outline = view === 'back' ? BACK_BODY_OUTLINE : FRONT_BODY_OUTLINE

  const regionData = useMemo(() => {
    const map = {}
    for (const [id, def] of Object.entries(regions)) {
      map[id] = aggregateRegionMuscle(id, def, muscleById)
    }
    return map
  }, [regions, muscleById])

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

  const activeMuscle = activeId ? regionData[activeId] : null

  return (
    <div className="relative">
      <div className="mb-3 flex rounded-2xl border border-zinc-800 bg-zinc-900/50 p-1">
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

      <div className="relative mx-auto max-w-[240px]">
        <svg
          viewBox={BODY_VIEWBOX}
          className="h-auto w-full drop-shadow-lg"
          role="img"
          aria-label={`${view} body muscle development map`}
        >
          <path
            d={outline}
            fill="#141416"
            stroke="#52525b"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path d={HEAD_PATH} fill="#1c1c1f" stroke="#52525b" strokeWidth="1" />

          {Object.entries(regions).map(([id, def]) => {
            const data = regionData[id]
            const fill = data?.color ?? TIER_COLORS.neglected
            const isActive = activeId === id
            return (
              <motion.path
                key={id}
                d={def.path}
                fill={fill}
                fillOpacity={isActive ? 0.92 : 0.78}
                stroke={isActive ? '#fafafa' : '#3f3f46'}
                strokeWidth={isActive ? 1.25 : 0.6}
                strokeLinejoin="round"
                className="cursor-pointer"
                aria-label={def.label}
                onMouseEnter={(e) => handleMuscleEnter(id, e)}
                onMouseLeave={handleMuscleLeave}
                onClick={(e) => handleMuscleEnter(id, e)}
                whileHover={{ fillOpacity: 0.9 }}
              />
            )
          })}
        </svg>

        {activeMuscle && tooltipPos ? (
          <MuscleTooltip muscle={activeMuscle} sessions={sessions} position={tooltipPos} />
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
