/**
 * Athletyx API URL resolution tests — run: node scripts/test-api-urls.mjs
 */
import { resolveAthletyxUrls, resolveAthletyxApiPath } from '../src/utils/athletyxApiUrls.js'

let failed = 0

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`)
    failed += 1
  } else {
    console.log(`✓ ${msg}`)
  }
}

const dev = resolveAthletyxUrls(undefined)
assert(dev.coachUrl === '/api/athletyx/coach', 'dev coach URL')
assert(dev.apiRoot === '/api/athletyx', 'dev API root')
assert(
  resolveAthletyxApiPath('nutrition/search', undefined) === '/api/athletyx/nutrition/search',
  'dev nutrition path (vite proxy → /api/nutrition/search)'
)
assert(
  resolveAthletyxApiPath('mcp/session', undefined) === '/api/athletyx/mcp/session',
  'dev MCP path'
)

const staging = resolveAthletyxUrls('https://api.example.up.railway.app/api/coach')
assert(staging.coachUrl === 'https://api.example.up.railway.app/api/coach', 'staging coach URL')
assert(staging.apiRoot === 'https://api.example.up.railway.app', 'staging API root')
assert(
  resolveAthletyxApiPath('nutrition/search', 'https://api.example.up.railway.app/api/coach') ===
    'https://api.example.up.railway.app/api/nutrition/search',
  'staging nutrition path'
)
assert(
  resolveAthletyxApiPath('mcp/session', 'https://api.example.up.railway.app/api/coach') ===
    'https://api.example.up.railway.app/api/mcp/session',
  'staging MCP path'
)
assert(`${staging.apiRoot}/health` === 'https://api.example.up.railway.app/health', 'health URL')

const hostCoach = resolveAthletyxUrls('https://api.example.com/coach')
assert(hostCoach.apiRoot === 'https://api.example.com', 'host-only /coach strips to origin')

const bare = resolveAthletyxUrls('https://api.example.com')
assert(bare.coachUrl === 'https://api.example.com/coach', 'bare host appends /coach')

if (failed > 0) process.exit(1)
console.log('All API URL tests passed')
