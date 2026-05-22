import { motion } from 'framer-motion'
import { Home, Dumbbell, BarChart3, Sparkles, User } from 'lucide-react'

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ai-trainer', label: 'AI Trainer', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: User },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/90 bg-zinc-950/90 backdrop-blur-2xl">
      <motion.div
        layout
        className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-1 pt-2"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className="relative flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-colors active:scale-95"
            >
              {active ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-1 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/25"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              ) : null}
              <Icon
                className={`relative h-5 w-5 transition-colors ${active ? 'text-emerald-400' : 'text-zinc-500'}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={`relative text-[10px] font-semibold ${active ? 'text-emerald-300' : 'text-zinc-500'}`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </motion.div>
    </nav>
  )
}
