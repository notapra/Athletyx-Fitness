/**
 * Per-user MCP session config (Phase 3 — JWT-scoped tools).
 */

import { getAccessToken } from './supabaseClient.js'
import { getAthletyxApiPath } from './athletyxService.js'

export async function fetchMcpSession() {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('Sign in to load your MCP configuration.')
  }

  const res = await fetch(getAthletyxApiPath('mcp/session'), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `MCP session error ${res.status}`)
  }

  return res.json()
}

export function buildCursorMcpJson(session, serverScriptPath) {
  const servers = {}
  for (const domain of session.domains ?? []) {
    servers[domain.server_name] = {
      command: 'python',
      args: [serverScriptPath],
      env: domain.env,
    }
  }
  if (session.public_server) {
    servers[session.public_server.server_name] = {
      command: 'python',
      args: [serverScriptPath],
      env: session.public_server.env,
    }
  }
  return { mcpServers: servers }
}
