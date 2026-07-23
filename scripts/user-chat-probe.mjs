/**
 * User-like chat/coach probe — expected vs actual.
 * Usage: node scripts/user-chat-probe.mjs [baseUrl]
 */

const BASE = (process.argv[2] || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function j(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try {
    data = await res.json()
  } catch {
    /* ignore */
  }
  return { status: res.status, data }
}

function preview(s, n = 240) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .slice(0, n)
}

const profileOk = {
  fitness_goal: 'strength',
  experience_level: 'intermediate',
  units: 'lbs',
  age: 28,
  ai_preferences: {
    personal_factors: {
      injury_history: ['right shoulder'],
      recovery_capacity: 'average',
      max_effort_level: 'aggressive',
    },
  },
}

const profileBad = {
  fitness_goal: 'strength',
  units: 'lbs',
  ai_preferences: { personal_factors: { max_effort_level: 'high' } },
}

const goals = [{ title: 'Bench 225', completed: false }]

const coachCases = [
  {
    id: 'protein',
    msg: 'How much protein should I eat?',
    expect: 'Specific protein g/lb guidance',
    match: (c) => /protein|bodyweight|per\s*lb|g\/lb|grams/i.test(c),
  },
  {
    id: 'bench',
    msg: 'How can I improve my bench?',
    expect: 'Bench tips; ideally note shoulder',
    match: (c) => /bench|press|chest|upper|shoulder|form|volume/i.test(c),
  },
  {
    id: 'legs',
    msg: 'Am I training legs enough?',
    expect: 'Legs / lower-body volume feedback',
    match: (c) => /leg|squat|lower|quad|ham|glute/i.test(c),
  },
  {
    id: 'deload',
    msg: 'Should I deload next week?',
    expect: 'Deload / recovery guidance',
    match: (c) => /deload|volume|intensity|recover|rest|week/i.test(c),
  },
  {
    id: 'recover',
    msg: 'Am I recovering well?',
    expect: 'Recovery / sleep answer',
    match: (c) => /recover|sleep|fatigue|rest|readiness/i.test(c),
  },
  {
    id: 'today',
    msg: 'What should I train today?',
    expect: 'Session recommendation',
    match: (c) => /train|session|workout|lift|rest|recover|rpe|effort/i.test(c),
  },
  {
    id: 'shoulder',
    msg: 'Can I do heavy overhead press with my shoulder?',
    expect: 'Caution about shoulder injury',
    match: (c) => /shoulder|injur|caution|modif|avoid|pain|medical|restrict|effort/i.test(c),
  },
  {
    id: 'hello',
    msg: 'hello',
    expect: 'Useful coaching reply (not empty)',
    match: (c) => c.length > 20,
  },
]

const rows = []

const health = (await j('GET', '/health')).data
console.log('HEALTH', {
  openai: health.openai_available,
  web: health.web_search_available,
  cache: health.cache,
})

console.log('\n=== AI Trainer path: POST /api/coach ===')
for (const c of coachCases) {
  const r = await j('POST', '/api/coach', {
    message: c.msg,
    profile: profileOk,
    goals,
  })
  const content = r.data.content || ''
  const fallback = /OPENAI_API_KEY|full LLM coaching/i.test(content)
  const topicOk = c.match(content)
  const injuryAware = /shoulder|injur/i.test(content)
  const row = {
    id: c.id,
    status: r.status,
    ok: r.status === 200 && topicOk,
    topicOk,
    fallback,
    injuryAware,
    citations: (r.data.citations || []).length,
    expect: c.expect,
    preview: preview(content),
  }
  rows.push(row)
  console.log(
    `${row.ok ? '✓' : '✗'} ${c.id} status=${r.status} topic=${topicOk} fallback=${fallback} citations=${row.citations}`
  )
  console.log(`  expect: ${c.expect}`)
  console.log(`  got:    ${row.preview}`)
}

console.log('\n=== Bug probe: invalid max_effort_level ===')
const bad = await j('POST', '/api/coach', {
  message: 'How much protein should I eat?',
  profile: profileBad,
  goals: [],
})
console.log({
  status: bad.status,
  detail: bad.data.detail || null,
  preview: preview(bad.data.content || JSON.stringify(bad.data)),
})

console.log('\n=== Legacy /api/chat (not used by AI Trainer UI) ===')
for (const msg of [
  'hello',
  'How much protein should I eat?',
  'hit bench 225 for 8, 8, 6',
  'hypertrophy push workout',
  'strength legs plan',
]) {
  const r = await j('POST', '/api/chat', { message: msg })
  console.log(
    `${r.status === 200 ? '✓' : '✗'} chat "${msg}" tool=${r.data.tool_used ?? 'none'} → ${preview(r.data.content, 160)}`
  )
}

console.log('\n=== Cache second hit ===')
const q = 'Should I deload next week?'
const a = await j('POST', '/api/coach', { message: q, profile: profileOk, goals })
const b = await j('POST', '/api/coach', { message: q, profile: profileOk, goals })
console.log({
  first_from_cache: a.data.from_cache ?? false,
  second_from_cache: b.data.from_cache ?? false,
  same_content: a.data.content === b.data.content,
})

const passed = rows.filter((r) => r.ok).length
console.log(`\nSUMMARY coach cases: ${passed}/${rows.length} met topic expectations`)
console.log(`Mode: openai=${health.openai_available} → ${health.openai_available ? 'LLM' : 'RAG/fallback (no OpenAI key)'}`)
process.exit(bad.status === 500 || passed < rows.length ? 1 : 0)
