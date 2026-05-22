import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = {
  emerald: '#34d399',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  amber: '#fbbf24',
}

export default function ScoreGauge({ value, label, sublabel, color = 'emerald', size = 100 }) {
  const fill = COLORS[color] ?? COLORS.emerald
  const data = [
    { value: clamp(value) },
    { value: 100 - clamp(value) },
  ]

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.38}
              outerRadius={size * 0.48}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={fill} />
              <Cell fill="rgb(39 39 42)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={value}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xl font-bold tabular-nums text-white"
          >
            {Math.round(value)}
          </motion.span>
        </div>
      </div>
      <p className="mt-1 text-xs font-semibold text-white">{label}</p>
      {sublabel ? <p className="text-[10px] text-zinc-500">{sublabel}</p> : null}
    </div>
  )
}

function clamp(v) {
  return Math.min(100, Math.max(0, Number(v) || 0))
}
