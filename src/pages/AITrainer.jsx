import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  TrendingUp,
  Moon,
  Dumbbell,
  Zap,
  Brain,
  ChevronDown,
} from 'lucide-react'
import { useApp } from '../hooks/useApp.js'
import { runFullAnalysis, getCoachHeadline } from '../utils/aiAnalysis.js'
import ScoreGauge from '../components/ai/ScoreGauge.jsx'
import InsightCard from '../components/ai/InsightCard.jsx'
import MuscleHeatMap from '../components/ai/MuscleHeatMap.jsx'
import AITrainerChat from '../components/ai/AITrainerChat.jsx'
import GoalGuardianCard from '../components/ai/GoalGuardianCard.jsx'
import { useGuardian } from '../hooks/useGuardian.js'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

const PERIODS = [
  { id: 7, label: '7D' },
  { id: 14, label: '14D' },
  { id: 30, label: '30D' },
]

const HEAT_COLORS = ['#34d399', '#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#fb7185']

export default function AITrainer() {
  const { sessions, setGuardianReminder } = useApp()
  const { contract, status, tick } = useGuardian()
  const [period, setPeriod] = useState(14)

  useEffect(() => {
    const { reminder } = tick()
    if (reminder) setGuardianReminder(reminder)
  }, [tick, setGuardianReminder])

  const analysis = useMemo(() => runFullAnalysis(sessions), [sessions])
  const headline = useMemo(() => getCoachHeadline(analysis), [analysis])

  const progression =
    period === 7
      ? analysis.progression.d7
      : period === 14
        ? analysis.progression.d14
        : analysis.progression.d30

  const muscle = period <= 14 ? analysis.muscle : analysis.muscle30

  return (
    <div className="space-y-6 px-4 pt-6 pb-8">
      <header className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-zinc-900/90 to-cyan-600/10 p-5 shadow-2xl">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/90">
                AI Personal Trainer
              </p>
              <h1 className="text-xl font-bold text-white">IronCoach</h1>
              <p className="text-[10px] text-cyan-400/90">
                Powered by <span className="font-semibold text-cyan-300">Athletyx</span> — personalized
                RAG + DuckDuckGo citations
              </p>
            </div>
          </div>
          <p className="mt-3 text-lg font-semibold text-white">{headline.title}</p>
          <p className="mt-1 text-sm text-zinc-400">{headline.subtitle}</p>

          <div className="mt-4 flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  period === p.id
                    ? 'bg-white/15 text-white ring-1 ring-white/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </motion.div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-3">
          <ScoreGauge
            value={analysis.recovery.readiness}
            label="Readiness"
            sublabel={analysis.recovery.readinessLabel}
            color="emerald"
            size={88}
          />
        </div>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-3">
          <ScoreGauge
            value={analysis.recovery.fatigue}
            label="Fatigue"
            sublabel={analysis.recovery.fatigueLabel}
            color="amber"
            size={88}
          />
        </div>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-3">
          <ScoreGauge
            value={analysis.recovery.recoveryScore}
            label="Recovery"
            sublabel="Overall"
            color="cyan"
            size={88}
          />
        </div>
      </section>

      <Section
        icon={TrendingUp}
        title="Progressive Overload"
        subtitle={`Analyzing ${progression.exercisesTracked} exercises · Score ${progression.score}`}
        accent="emerald"
      >
        {progression.insights.length === 0 ? (
          <EmptyInsight text="Log more sessions to unlock progression analysis and overload recommendations." />
        ) : (
          <div className="space-y-2">
            {progression.insights.map((ins, i) => (
              <InsightCard
                key={`${ins.exercise}-${i}`}
                message={ins.message}
                severity={ins.severity}
                action={ins.action}
                delay={i}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={Moon}
        title="Recovery & Sleep"
        subtitle={`ACWR ${analysis.recovery.acwr} · ${analysis.recovery.weeklySessions} sessions this week`}
        accent="cyan"
      >
        <div className="mb-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">Recommended sleep</p>
              <p className="text-2xl font-bold text-white">
                {analysis.recovery.sleepRange.min}–{analysis.recovery.sleepRange.max}h
              </p>
            </div>
            <FatigueBar value={analysis.recovery.fatigue} />
          </div>
          {analysis.recovery.loadChangePct !== 0 ? (
            <p className="mt-2 text-xs text-cyan-200/70">
              Recovery demand {analysis.recovery.loadChangePct > 0 ? '↑' : '↓'}{' '}
              {Math.abs(analysis.recovery.loadChangePct)}% vs prior period
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          {analysis.recovery.insights.map((ins, i) => (
            <InsightCard
              key={i}
              message={ins.message}
              severity={ins.severity ?? 'default'}
              delay={i}
            />
          ))}
        </div>
      </Section>

      <Section
        icon={Dumbbell}
        title="Muscle Balance"
        subtitle={`Balance score ${muscle.balanceScore} · Push/Pull ${muscle.pushPullRatio}`}
        accent="violet"
      >
        <MuscleHeatMap heatMap={muscle.heatMap} />
        {muscle.distribution.length > 0 ? (
          <div className="mt-4 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={muscle.distribution.slice(0, 6)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                  formatter={(v) => [`${v}%`, 'Volume']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {muscle.distribution.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={HEAT_COLORS[i % HEAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        <div className="mt-3 space-y-2">
          {muscle.insights.map((ins, i) => (
            <InsightCard
              key={i}
              message={ins.message}
              severity={ins.severity ?? 'default'}
              delay={i}
            />
          ))}
        </div>
      </Section>

      <Section
        icon={Zap}
        title="Training Intensity"
        subtitle={`${analysis.intensity.hypertrophyPct}% sets in hypertrophy range`}
        accent="amber"
      >
        <div className="mb-4 grid grid-cols-3 gap-2">
          <MiniScore label="Intensity" value={analysis.intensity.intensityScore} />
          <MiniScore label="Quality" value={analysis.intensity.qualityScore} />
          <MiniScore label="Consistency" value={analysis.intensity.consistencyScore} />
        </div>
        <div className="space-y-2">
          {analysis.intensity.insights.map((ins, i) => (
            <InsightCard
              key={i}
              message={ins.message}
              severity={ins.severity ?? 'default'}
              delay={i}
            />
          ))}
        </div>
      </Section>

      <GoalGuardianCard status={status} contract={contract} />

      <Section icon={Brain} title="Ask IronCoach" subtitle="Personalized AI fitness assistant" accent="violet">
        <AITrainerChat analysis={analysis} />
      </Section>
    </div>
  )
}

function Section({ icon: Icon, title, subtitle, accent, children }) {
  const [open, setOpen] = useState(true)
  const ring =
    accent === 'emerald'
      ? 'ring-emerald-500/20'
      : accent === 'cyan'
        ? 'ring-cyan-500/20'
        : accent === 'amber'
          ? 'ring-amber-500/20'
          : 'ring-violet-500/20'

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4 ring-1 ${ring}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-[11px] text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-zinc-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </motion.section>
  )
}

function FatigueBar({ value }) {
  return (
    <div className="w-24">
      <p className="mb-1 text-right text-[10px] text-zinc-500">Fatigue</p>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            value >= 70 ? 'bg-red-400' : value >= 45 ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        />
      </div>
    </div>
  )
}

function MiniScore({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  )
}

function EmptyInsight({ text }) {
  return (
    <p className="rounded-2xl border border-dashed border-zinc-700 py-6 text-center text-sm text-zinc-500">
      {text}
    </p>
  )
}
