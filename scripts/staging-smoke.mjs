/**
 * Staging API smoke — run after Railway deploy.
 * Usage: node scripts/staging-smoke.mjs https://your-api.up.railway.app
 */

const BASE = (process.argv[2] || '').replace(/\/$/, '')
if (!BASE) {
  console.error('Usage: node scripts/staging-smoke.mjs <apiBaseUrl>')
  process.exit(1)
}

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
  if (String(data.auth_required) !== 'true') {
    throw new Error(`expected auth_required true, got ${data.auth_required}`)
  }
  if (!Array.isArray(data.features) || !data.features.includes('nutrition')) {
    throw new Error('expected nutrition feature flag')
  }
  if (!headers.get('x-request-id')) throw new Error('missing X-Request-Id')
  return { features: data.features }
})

await check('GET /api/nutrition/search shape', async () => {
  const { status, data } = await json('GET', '/api/nutrition/search?q=oats')
  if (status !== 200) throw new Error(`status ${status}`)
  if (!Array.isArray(data.results)) throw new Error('missing results')
})

await check('POST /api/coach without auth (expect 401 when REQUIRE_AUTH)', async () => {
  const { status } = await json('POST', '/api/coach', {
    message: 'staging smoke',
    profile: {},
    goals: [],
  })
  if (status !== 401) throw new Error(`expected 401, got ${status}`)
})

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
