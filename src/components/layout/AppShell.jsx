import { AnimatePresence, motion } from 'framer-motion'
import BottomNav from './BottomNav.jsx'
import DynamicIsland from '../workout/DynamicIsland.jsx'

export default function AppShell({
  activeTab,
  onTabChange,
  children,
  hideNav = false,
  showIsland = true,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative min-h-svh bg-zinc-950 text-zinc-100"
    >
      <motion.div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-[-60px] top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-violet-500/8 blur-3xl"
        />
      </motion.div>

      {showIsland ? <DynamicIsland /> : null}

      <main
        className={`app-scroll mx-auto min-h-svh max-w-lg ${hideNav ? 'pb-6' : 'pb-28'} ${showIsland ? 'pt-[4.5rem]' : ''} safe-top`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {!hideNav ? <BottomNav activeTab={activeTab} onTabChange={onTabChange} /> : null}
    </motion.div>
  )
}
