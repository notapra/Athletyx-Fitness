# Gemini Live WebSocket pipeline (Athletyx)

Server-side Live API gateway. The browser **never** holds `GEMINI_API_KEY`.

## Architecture

```
Browser GeminiLiveClient
  --WS--> Athletyx /api/ws/live-vision
            --SDK--> Google Gemini Live
```

## Run locally

```bash
# Terminal 1
npm run dev

# Terminal 2 — required for WS + REST vision
npm run dev:api
```

Verify:

```bash
curl http://127.0.0.1:8000/health
# gemini_live_available: true
# features includes gemini_live_ws
```

## Env (`PRIVATE.env`)

```
GEMINI_API_KEY=...
GEMINI_LIVE_MODEL=gemini-2.0-flash-live-001
```

If the Live model name is rejected by Google, update `GEMINI_LIVE_MODEL` to a current Live-capable model from AI Studio docs.

## Client protocol

Browser → server:

| type | purpose |
|------|---------|
| `start` | Begin session (`loggedExercise`, `catalog`, `resumeHandle`) |
| `frame` | JPEG base64 (server enforces ≥1s between frames) |
| `text` | User / coach text turn |
| `ping` | Keep-alive |
| `stop` | End |

Server → browser: `hello`, `ready`, `model_text`, `tool_call`, `stats`, `go_away`, `resumption_handle`, `reconnecting`, `error`, `pong`, `closed`.

## Resilience

- Exponential backoff reconnect inside `GeminiLiveSession` (up to 5 attempts)
- Optional `SessionResumptionConfig` when SDK supports it
- GoAway surfaced to the UI
- Server drops over-rate frames; client also throttles to ~1 FPS, ≤720p JPEG ~75%
- REST `/api/form-vision` remains as automatic fallback if WS cannot start

## Files

- [`athletyx/backend/gemini_live_client.py`](../athletyx/backend/gemini_live_client.py)
- [`athletyx/backend/live_vision_ws.py`](../athletyx/backend/live_vision_ws.py)
- [`src/services/geminiLiveClient.js`](../src/services/geminiLiveClient.js)
- Form Vision panel uses WS first, then REST fallback
