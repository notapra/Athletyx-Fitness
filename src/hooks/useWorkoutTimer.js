import { useEffect, useState } from 'react'

export function useWorkoutTimer(startedAt, isActive) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isActive || startedAt == null) return undefined

    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt, isActive])

  return elapsed
}
