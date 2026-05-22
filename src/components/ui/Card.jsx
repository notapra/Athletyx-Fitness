import { motion } from 'framer-motion'

export default function Card({ children, className = '', onClick, delay = 0 }) {
  const Comp = onClick ? motion.button : motion.div

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.35 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`glass-card w-full rounded-3xl p-4 text-left shadow-2xl shadow-black/30 transition-all duration-300 ${onClick ? 'active:scale-[0.98]' : ''} ${className}`}
    >
      {children}
    </Comp>
  )
}
