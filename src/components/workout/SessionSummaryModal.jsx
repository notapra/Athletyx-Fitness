import { motion } from 'framer-motion'
import { Trophy, Clock, Dumbbell, TrendingUp, Shield } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { formatDuration } from '../../utils/session.js'

export default function SessionSummaryModal({ open, summary, guardianNote, onClose }) {
  if (!summary) return null

  const { volume, sets, exercises, prs, duration } = summary

  return (
    <Modal open={open} onClose={onClose} title="Workout complete">
      <div className="space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 p-4 text-center ring-1 ring-emerald-500/30"
        >
          <p className="text-3xl font-bold text-white">{volume.toLocaleString()}</p>
          <p className="text-sm text-emerald-200/80">total volume (lbs)</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Clock} label="Duration" value={formatDuration(duration)} />
          <Stat icon={Dumbbell} label="Sets" value={sets} />
          <Stat icon={TrendingUp} label="Exercises" value={exercises} />
        </div>

        {guardianNote ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-100/90">{guardianNote}</p>
          </div>
        ) : null}

        {prs.length > 0 ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-amber-200">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-semibold">New PRs</span>
            </div>
            <ul className="space-y-1">
              {prs.map((pr) => (
                <li key={pr.exercise} className="text-sm text-zinc-200">
                  {pr.exercise} — <span className="font-bold text-white">{pr.weight} lbs</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-3.5 text-sm font-bold text-zinc-950 transition active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </Modal>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-zinc-500" />
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  )
}
