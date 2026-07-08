/**
 * Smoke test — run after `npm run dev:api` on port 8000.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */

const BASE = (process.argv[2] || 'http://127.0.0.1:8000').replace(/\/$/, '')

const results = []

async function check(name, fn) {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail })
    console.log(`✓ ${name}`)
  } catch (e) {
    results.push({ name, ok: false, error: e.message })
    console.error(`✗ ${name}: ${e.message}`)
  }
}

async function json(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  return { status: res.status, headers: res.headers, data }
}

await check('GET /health', async () => {
  const { status, data, headers } = await json('GET', '/health')
  if (status !== 200) throw new Error(`status ${status}`)
  if (data.status !== 'ok') throw new Error('not ok')
  if (!headers.get('x-request-id')) throw new Error('missing X-Request-Id')
  return data
})

await check('GET /api/coach/cache-stats', async () => {
  const { status } = await json('GET', '/api/coach/cache-stats')
  if (status !== 200) throw new Error(`status ${status}`)
})

await check('POST /api/coach validates empty message', async () => {
  const { status } = await json('POST', '/api/coach', { message: '' })
  if (status !== 422) throw new Error(`expected 422, got ${status}`)
})

const coachBody = {
  message: 'How much protein per day?',
  profile: { fitness_goal: 'strength', units: 'lbs' },
  goals: [],
}

await check('POST /api/coach returns content', async () => {
  const { status, data } = await json('POST', '/api/coach', coachBody)
  if (status !== 200) throw new Error(`status ${status}`)
  if (!data.content) throw new Error('missing content')
  return { from_cache: data.from_cache }
})

await check('POST /api/coach cache hit on repeat', async () => {
  const { status, data } = await json('POST', '/api/coach', coachBody)
  if (status !== 200) throw new Error(`status ${status}`)
  if (!data.from_cache) throw new Error('expected from_cache true')
})

await check('POST /api/chat', async () => {
  const { status, data } = await json('POST', '/api/chat', { message: 'hello' })
  if (status !== 200) throw new Error(`status ${status}`)
  if (!data.content) throw new Error('missing content')
})

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
