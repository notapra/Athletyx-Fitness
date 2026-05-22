import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Trash2, Target } from 'lucide-react'
import { sendChatMessage, getChatHistory, clearChatHistory, persistMessage } from '../../services/aiService.js'
import { createId } from '../../utils/session.js'
import { SUGGESTED_QUESTIONS } from '../../utils/aiPrompts.js'
import { useApp } from '../../hooks/useApp.js'
import { useGuardian } from '../../hooks/useGuardian.js'
import { resetDriftWarningCount } from '../../services/guardianService.js'

export default function AITrainerChat({ analysis }) {
  const { userId, sessions } = useApp()
  const { contract } = useGuardian()
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: 'Loading coach…' }])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getChatHistory(userId).then((history) => {
      if (!cancelled) {
        setMessages(history)
        setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  async function handleSend(text = input, refocus = false) {
    const trimmed = refocus ? 'Refocus on my goals' : text.trim()
    if (!trimmed || isTyping || !loaded) return

    if (!refocus) {
      const userMsg = { id: createId(), role: 'user', content: trimmed }
      setMessages((prev) => [...prev, userMsg])
      await persistMessage('user', trimmed, userId)
      setInput('')
    }

    setIsTyping(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const result = await sendChatMessage(trimmed, analysis, {
        contract,
        chatHistory: history,
        sessions,
        userId,
        refocusGoals: refocus,
      })

      const content = typeof result === 'string' ? result : result.content
      const guardianNote = typeof result === 'object' ? result.guardianNote : null
      const warningLevel = typeof result === 'object' ? result.warningLevel : null

      const botMsg = {
        id: createId(),
        role: 'assistant',
        content,
        guardianNote,
        warningLevel,
      }
      setMessages((prev) => [...prev, botMsg])
      await persistMessage('assistant', content, userId)

      if (refocus) resetDriftWarningCount()
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: createId(), role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  async function handleClear() {
    await clearChatHistory(userId)
    resetDriftWarningCount()
    setMessages([
      { id: 'welcome', role: 'assistant', content: 'Chat cleared. How can I help with your training?' },
    ])
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-zinc-950 ring-1 ring-violet-500/10">
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">IronCoach</p>
            <p className="text-[10px] text-zinc-500">Monitored by Goal Guardian</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          title="Clear chat"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-br-md bg-emerald-500 text-zinc-950'
                    : 'rounded-bl-md border border-zinc-800 bg-zinc-900/80 text-zinc-100'
                }`}
              >
                {msg.content}
              </div>
              {msg.guardianNote ? (
                <p
                  className={`mt-1 max-w-[88%] rounded-xl px-3 py-2 text-[11px] ${
                    msg.warningLevel === 'high'
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-100'
                      : 'border border-zinc-700 bg-zinc-900/60 text-zinc-400'
                  }`}
                >
                  {msg.guardianNote}
                </p>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
            </div>
          </motion.div>
        ) : null}
      </div>

      <div className="border-t border-zinc-800/80 px-3 py-3">
        <button
          type="button"
          onClick={() => handleSend('', true)}
          disabled={isTyping}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/15 disabled:opacity-50"
        >
          <Target className="h-3.5 w-3.5" />
          Refocus on my goals
        </button>
        <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              disabled={isTyping}
              className="shrink-0 rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1 text-[10px] font-medium text-zinc-400 transition hover:border-violet-500/40 hover:text-violet-200 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI coach..."
            disabled={isTyping}
            className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
