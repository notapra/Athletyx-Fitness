/**
 * Browser client for Athletyx ↔ Gemini Live WebSocket gateway.
 * Frames are throttled (≤1 FPS), JPEG-compressed, and never sent with the API key.
 */

import { getAthletyxApiRoot } from './athletyxService.js'
import { captureVideoFrame, getLiveVisionCaptureProfile } from './formVision.js'

const DEFAULT_MIN_INTERVAL_MS = 1000
const MAX_WIDTH = 720
const JPEG_QUALITY = 0.75

function resolveLiveVisionWsUrl() {
  const root = getAthletyxApiRoot()
  if (root.startsWith('http://') || root.startsWith('https://')) {
    const u = new URL(root)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    const basePath = u.pathname.replace(/\/$/, '')
    if (basePath.endsWith('/api')) {
      u.pathname = `${basePath}/ws/live-vision`
    } else if (!basePath || basePath === '/') {
      u.pathname = '/api/ws/live-vision'
    } else {
      u.pathname = `${basePath}/api/ws/live-vision`
    }
    return u.toString()
  }
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173'
  return `${proto}//${host}/api/athletyx/ws/live-vision`
}

function validateBase64Jpeg(b64) {
  const raw = (b64 || '').trim()
  const data = raw.includes(',') && raw.startsWith('data:') ? raw.split(',', 1)[1] : raw
  if (!data || data.length < 64) throw new Error('Frame base64 too short')
  if (!/^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 200))) {
    throw new Error('Frame base64 has invalid characters')
  }
  // Rough decoded size estimate
  const approxBytes = Math.floor((data.length * 3) / 4)
  if (approxBytes > 2_000_000) throw new Error('Frame exceeds 2MB after encode')
  return data
}

/**
 * @typedef {object} GeminiLiveHandlers
 * @property {(msg: object) => void} [onMessage]
 * @property {(err: Error) => void} [onError]
 * @property {() => void} [onOpen]
 * @property {() => void} [onClose]
 */

export class GeminiLiveClient {
  /**
   * @param {GeminiLiveHandlers} handlers
   */
  constructor(handlers = {}) {
    this.handlers = handlers
    this.ws = null
    this.minIntervalMs = DEFAULT_MIN_INTERVAL_MS
    this._lastFrameAt = 0
    this._resumeHandle = null
    this._started = false
    this._stats = { framesSent: 0, framesDropped: 0, lastFrameBytes: 0 }
  }

  get stats() {
    return { ...this._stats }
  }

  get resumeHandle() {
    return this._resumeHandle
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    const url = resolveLiveVisionWsUrl()
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.handlers.onOpen?.()
    }
    ws.onmessage = (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        this.handlers.onError?.(new Error('Invalid gateway JSON'))
        return
      }
      if (msg.type === 'hello' && msg.minFrameIntervalMs) {
        this.minIntervalMs = Number(msg.minFrameIntervalMs) || DEFAULT_MIN_INTERVAL_MS
      }
      if (msg.type === 'resumption_handle' && msg.handle) {
        this._resumeHandle = msg.handle
      }
      if (msg.type === 'stats') {
        if (msg.dropped) this._stats.framesDropped += 1
        if (msg.lastFrameBytes) this._stats.lastFrameBytes = msg.lastFrameBytes
        if (typeof msg.framesAccepted === 'number') {
          this._stats.framesSent = msg.framesAccepted
        }
      }
      this.handlers.onMessage?.(msg)
    }
    ws.onerror = () => {
      this.handlers.onError?.(new Error('Live Vision WebSocket error'))
    }
    ws.onclose = () => {
      this._started = false
      this.handlers.onClose?.()
    }
  }

  /**
   * @param {{ loggedExercise?: string, catalog?: string[], resumeHandle?: string }} opts
   */
  start(opts = {}) {
    this.connect()
    const sendStart = () => {
      this._send({
        type: 'start',
        loggedExercise: opts.loggedExercise || null,
        catalog: opts.catalog || [],
        resumeHandle: opts.resumeHandle || this._resumeHandle || null,
      })
      this._started = true
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      sendStart()
    } else if (this.ws) {
      this.ws.addEventListener('open', sendStart, { once: true })
    }
  }

  _send(obj) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Live Vision socket not open — is npm run dev:api running?')
    }
    this.ws.send(JSON.stringify(obj))
  }

  ping() {
    this._send({ type: 'ping', ts: Date.now() })
  }

  sendText(text) {
    this._send({ type: 'text', text })
  }

  /**
   * Capture + throttle + validate + send one JPEG frame from a <video>.
   * @returns {{ sent: boolean, reason?: string, bytesApprox?: number }}
   */
  sendVideoFrame(videoEl, profileOverrides = {}) {
    const now = Date.now()
    if (now - this._lastFrameAt < this.minIntervalMs) {
      this._stats.framesDropped += 1
      return { sent: false, reason: 'throttle' }
    }
    const profile = { ...getLiveVisionCaptureProfile(), ...profileOverrides }
    const maxWidth = Math.min(MAX_WIDTH, profile.maxWidth || MAX_WIDTH)
    const quality = Math.max(profile.quality || JPEG_QUALITY, 0.55)
    const b64 = captureVideoFrame(videoEl, { maxWidth, quality: Math.min(quality, JPEG_QUALITY) })
    const data = validateBase64Jpeg(b64)
    const bytesApprox = Math.floor((data.length * 3) / 4)
    this._send({ type: 'frame', data, mimeType: 'image/jpeg' })
    this._lastFrameAt = now
    this._stats.framesSent += 1
    this._stats.lastFrameBytes = bytesApprox
    return { sent: true, bytesApprox }
  }

  stop() {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this._send({ type: 'stop' })
      }
    } catch {
      /* ignore */
    }
    try {
      this.ws?.close()
    } catch {
      /* ignore */
    }
    this.ws = null
    this._started = false
  }
}

export function getLiveVisionWsUrlForDebug() {
  return resolveLiveVisionWsUrl()
}
