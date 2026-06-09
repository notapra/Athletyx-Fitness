/**
 * IronCoach — client-side coaching pipeline (offline-first).
 *
 * Architecture (AI engineer interview):
 * 1. **Context assembly**: runFullAnalysis(sessions) → structured metrics (RAG-like, but deterministic).
 * 2. **Prompting**: buildChatPrompt injects goal contract + training stats into system context.
 * 3. **Generation**: default = keyword router (no API); optional OpenAI path when useApi + keys set.
 * 4. **Guardrails**: reviewCoachReply() post-processes draft for goal drift (supervisor pattern).
 *
 * Tradeoff: zero latency/cost offline vs Athletyx server agent (LangChain + tools) for deep reasoning.
 */

import { buildChatPrompt } from '../utils/aiPrompts.js'
import { reviewCoachReply, buildRefocusedReply } from './guardianService.js'
import { sendAthletyxCoachMessage, checkAthletyxHealth } from './athletyxService.js'
import { loadProfile } from '../utils/storage.js'
import { buildCitationsFromAthletyxResponse } from '../utils/athletyxCitations.js'

const CHAT_STORAGE_KEY = 'gymtracker_ai_chat_v1'

const WELCOME =
  "I'm IronCoach, your AI personal trainer. I analyze your workouts, recovery, and progression in real time — kept on track by Goal Guardian. Ask me anything about training, nutrition, or recovery."

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(messages) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)))
  } catch {
    /* storage full */
  }
}

export async function getChatHistory() {
  const local = loadHistory()
  if (local.length > 0) {
    return local.map((m) => ({ id: m.id, role: m.role, content: m.content ?? m.message }))
  }
  return [{ id: 'welcome', role: 'assistant', content: WELCOME }]
}

export async function clearChatHistory() {
  localStorage.removeItem(CHAT_STORAGE_KEY)
}

export async function persistMessage(role, content) {
  const history = loadHistory()
  history.push({ id: crypto.randomUUID?.() ?? `m-${history.length}`, role, content })
  saveHistory(history)
  return history
}

function matchKeywords(text, words) {
  const lower = text.toLowerCase()
  return words.some((w) => lower.includes(w))
}

/**
 * Phase-1 "router": intent buckets via keyword match over precomputed analysis.
 * Replace with embeddings + classifier or LLM function-calling while keeping analysis input.
 */
function generateCoachResponse(userMessage, analysis, contract) {
  const msg = userMessage.toLowerCase()
  const { recovery, progression, muscle, intensity, stats } = analysis

  if (matchKeywords(msg, ['sleep', 'rest', 'recover', 'fatigue', 'tired'])) {
    const top = recovery.insights[0]
    return (
      top?.message ??
      `Aim for ${recovery.sleepRange.min}–${recovery.sleepRange.max}h sleep. Readiness is ${recovery.readiness}%.`
    )
  }

  if (matchKeywords(msg, ['bench', 'squat', 'deadlift', 'press', 'row'])) {
    const lift = progression.d30.insights.find((i) =>
      matchKeywords(i.exercise?.toLowerCase() ?? '', [msg.split(' ')[0]])
    )
    return lift?.message ?? `Log more ${msg} sessions for progression tracking.`
  }

  if (matchKeywords(msg, ['protein', 'eat', 'nutrition', 'calorie', 'diet'])) {
    return contract?.primaryGoal?.toLowerCase().includes('cut')
      ? 'Prioritize protein at ~0.8–1g per lb while maintaining a moderate deficit. Keep lifting heavy to preserve muscle.'
      : 'Aim for ~0.7–1g protein per lb bodyweight. Spread intake across 3–4 meals for muscle recovery.'
  }

  if (matchKeywords(msg, ['today', 'train', 'workout', 'session', 'what should'])) {
    const r = recovery.readiness
    if (r >= 70) return `You're ${recovery.readinessLabel} (${r}% readiness). Good day for quality work — ${progression.d7.insights[0]?.message ?? 'hit your priority lifts.'}`
    return `Recovery is ${r}% — consider lighter volume or technique work. ${recovery.insights[0]?.message ?? ''}`
  }

  if (matchKeywords(msg, ['pull', 'push', 'balance', 'ratio'])) {
    const ratioInsight = muscle.insights.find((i) => i.type === 'ratio')
    return (
      ratioInsight?.message ??
      `Push/pull ratio is ${muscle.pushPullRatio}:1. ${contract?.primaryGoal ? `Goal context: ${contract.primaryGoal}.` : ''}`
    )
  }

  if (matchKeywords(msg, ['progress', 'plateau', 'strength', 'improve'])) {
    const topInsight = progression.d30.insights[0]
    return topInsight
      ? `${topInsight.message} ${contract?.primaryGoal ? `Tied to your goal: ${contract.primaryGoal}.` : ''}`
      : `Keep logging consistently. Quality score is ${intensity.qualityScore}%.`
  }

  const topProgression = progression.d30.insights[0]
  const topRecovery = recovery.insights[0]
  return `Based on your last 30 days (${stats.totalWorkouts} sessions): ${topProgression?.message ?? ''} ${topRecovery?.message ?? ''} ${contract?.primaryGoal ? `Primary goal: ${contract.primaryGoal}.` : ''} Ask me about bench, legs, protein, or what to train today.`
}

/**
 * End-to-end chat turn: optional LLM → draft → Guardian review → { content, driftScore, ... }.
 */
export async function sendChatMessage(userMessage, analysis, options = {}) {
  const {
    useApi = false,
    apiEndpoint = null,
    apiKey = null,
    contract = null,
    chatHistory = [],
    sessions = [],
    userId = null,
    refocusGoals = false,
    profile = null,
    goals = [],
    useAthletyx = true,
    onAthletyxStatus = null,
  } = options

  if (refocusGoals && contract) {
    return {
      content: buildRefocusedReply(contract, analysis),
      driftScore: 0,
      guardianNote: null,
      warningLevel: null,
    }
  }

  let draft
  let athletyxMeta = null

  // Athletyx backend: RAG + SerpAPI + personalization (keys in PRIVATE.env on server)
  if (useAthletyx) {
    try {
      onAthletyxStatus?.('Athletyx · checking connection…')
      const apiUp = await checkAthletyxHealth()
      if (apiUp) {
        onAthletyxStatus?.('Athletyx · personalizing for your profile')
        const userProfile = profile ?? loadProfile()
        onAthletyxStatus?.('Athletyx · searching knowledge base (RAG)')
        const ragTimer = setTimeout(() => {
          onAthletyxStatus?.('Athletyx · searching DuckDuckGo')
        }, 900)
        const result = await sendAthletyxCoachMessage(userMessage, {
          profile: userProfile,
          goals,
          analysis,
        })
        clearTimeout(ragTimer)
        onAthletyxStatus?.('Athletyx · building your answer')
        draft = result.content
        athletyxMeta = {
          poweredBy: result.powered_by ?? 'Athletyx',
          citations: buildCitationsFromAthletyxResponse(result),
          searchTrace: result.search_trace ?? {},
          personalizationApplied: result.personalization_applied,
        }
      }
    } catch {
      /* fall through to offline / OpenAI paths */
    } finally {
      onAthletyxStatus?.(null)
    }
  }

  // OpenAI-compatible chat completions — system prompt carries full user analytics context
  if (!draft && useApi && apiEndpoint && apiKey) {
    const prompt = buildChatPrompt(userMessage, analysis, contract)
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMessage },
        ],
      }),
    })
    if (!response.ok) throw new Error('AI API request failed')
    const data = await response.json()
    draft = data.choices?.[0]?.message?.content ?? 'No response received.'
  } else if (!draft) {
    // Simulated latency so UX feels like a model call during demos without API keys
    await delay(800 + Math.random() * 700)
    draft = generateCoachResponse(userMessage, analysis, contract)
  }

  const base = {
    content: draft,
    athletyxMeta,
    driftScore: 0,
    guardianNote: null,
    warningLevel: null,
  }

  if (!contract) {
    return base
  }

  // Supervisor layer: score drift vs goal contract before returning to UI
  const reviewed = await reviewCoachReply({
    reply: draft,
    userMessage,
    contract,
    chatHistory,
    sessions,
    userId,
  })
  return { ...reviewed, athletyxMeta }
}
