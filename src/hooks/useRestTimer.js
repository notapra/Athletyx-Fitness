import { useCallback, useEffect, useRef, useState } from 'react'

const PRESETS = [60, 90, 180]

export function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const intervalRef = useRef(null)
  const audioCtxRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {
      /* audio unavailable */
    }
  }, [])

  const start = useCallback(
    (seconds = 90) => {
      clearTimer()
      setTotalSeconds(seconds)
      setSecondsLeft(seconds)
      setIsRunning(true)
      setIsVisible(true)
    },
    [clearTimer]
  )

  const pause = useCallback(() => {
    setIsRunning(false)
    clearTimer()
  }, [clearTimer])

  const resume = useCallback(() => {
    if (secondsLeft <= 0) return
    setIsRunning(true)
  }, [secondsLeft])

  const dismiss = useCallback(() => {
    clearTimer()
    setIsRunning(false)
    setIsVisible(false)
    setSecondsLeft(0)
    setTotalSeconds(0)
  }, [clearTimer])

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) {
      clearTimer()
      return undefined
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          playChime()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearTimer()
  }, [isRunning, secondsLeft, clearTimer, playChime])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0

  return {
    PRESETS,
    secondsLeft,
    totalSeconds,
    isRunning,
    isVisible,
    progress,
    start,
    pause,
    resume,
    dismiss,
    setIsVisible,
  }
}
