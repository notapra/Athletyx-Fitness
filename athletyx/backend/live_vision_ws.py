"""
Browser ↔ Athletyx ↔ Gemini Live WebSocket gateway.

Client protocol (JSON):
  { "type": "start", "loggedExercise"?, "catalog"?, "resumeHandle"? }
  { "type": "frame", "data": "<base64 jpeg>", "mimeType"?: "image/jpeg" }
  { "type": "text", "text": "..." }
  { "type": "ping" }
  { "type": "stop" }

Server protocol (JSON):
  ready | model_text | tool_call | go_away | resumption_handle |
  reconnecting | error | pong | stats | closed
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.gemini_live_client import GeminiLiveSession, gemini_live_available, gemini_live_model

logger = logging.getLogger("athletyx.live_vision_ws")

router = APIRouter()

# Enforce server-side frame rate even if the client misbehaves
MIN_FRAME_INTERVAL_S = 1.0
KEEPALIVE_INTERVAL_S = 25.0


async def _send(ws: WebSocket, payload: dict[str, Any]) -> None:
    await ws.send_text(json.dumps(payload))


@router.websocket("/api/ws/live-vision")
async def live_vision_ws(websocket: WebSocket):
    await websocket.accept()

    if not gemini_live_available():
        await _send(
            websocket,
            {
                "type": "error",
                "message": "GEMINI_API_KEY not configured on server",
                "retryable": False,
            },
        )
        await websocket.close(code=1013)
        return

    await _send(
        websocket,
        {
            "type": "hello",
            "model": gemini_live_model(),
            "minFrameIntervalMs": int(MIN_FRAME_INTERVAL_S * 1000),
            "features": ["frames", "text", "tools", "resumption", "backoff"],
        },
    )

    live: GeminiLiveSession | None = None
    live_task: asyncio.Task | None = None
    keepalive_task: asyncio.Task | None = None
    last_frame_at = 0.0
    frames_accepted = 0

    async def on_event(payload: dict[str, Any]) -> None:
        try:
            await _send(websocket, payload)
        except Exception:
            logger.debug("Failed to forward event to browser", exc_info=True)

    async def keepalive_loop() -> None:
        nonlocal live
        while True:
            await asyncio.sleep(KEEPALIVE_INTERVAL_S)
            if live is None:
                continue
            try:
                await live.send_ping_keepalive()
            except Exception:
                logger.debug("keepalive failed", exc_info=True)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await _send(
                    websocket,
                    {"type": "error", "message": "Invalid JSON", "retryable": False},
                )
                continue

            mtype = msg.get("type")

            if mtype == "ping":
                await _send(websocket, {"type": "pong", "ts": msg.get("ts")})
                continue

            if mtype == "stop":
                break

            if mtype == "start":
                if live_task and not live_task.done():
                    await _send(
                        websocket,
                        {
                            "type": "error",
                            "message": "Session already started",
                            "retryable": False,
                        },
                    )
                    continue

                catalog = msg.get("catalog") or []
                if not isinstance(catalog, list):
                    catalog = []
                catalog = [str(x).strip() for x in catalog if str(x).strip()][:80]

                live = GeminiLiveSession(
                    on_event=on_event,
                    logged_exercise=msg.get("loggedExercise") or msg.get("logged_exercise"),
                    catalog=catalog,
                    resume_handle=msg.get("resumeHandle") or msg.get("resume_handle"),
                )
                live_task = asyncio.create_task(live.run())
                if keepalive_task is None or keepalive_task.done():
                    keepalive_task = asyncio.create_task(keepalive_loop())
                continue

            if mtype == "frame":
                if live is None:
                    await _send(
                        websocket,
                        {
                            "type": "error",
                            "message": "Send start before frames",
                            "retryable": False,
                        },
                    )
                    continue

                now = asyncio.get_event_loop().time()
                if now - last_frame_at < MIN_FRAME_INTERVAL_S:
                    await _send(
                        websocket,
                        {
                            "type": "stats",
                            "dropped": True,
                            "reason": "rate_limit",
                            "minIntervalMs": int(MIN_FRAME_INTERVAL_S * 1000),
                        },
                    )
                    continue

                data = msg.get("data") or ""
                mime = msg.get("mimeType") or msg.get("mime_type") or "image/jpeg"
                try:
                    await live.send_jpeg_b64(str(data), mime_type=str(mime))
                    last_frame_at = now
                    frames_accepted += 1
                    await _send(
                        websocket,
                        {
                            "type": "stats",
                            "framesAccepted": frames_accepted,
                            "lastFrameBytes": live.last_frame_bytes,
                            "dropped": False,
                        },
                    )
                except ValueError as exc:
                    await _send(
                        websocket,
                        {
                            "type": "error",
                            "message": str(exc),
                            "retryable": False,
                        },
                    )
                except Exception as exc:
                    await _send(
                        websocket,
                        {
                            "type": "error",
                            "message": f"Frame send failed: {exc}",
                            "retryable": True,
                        },
                    )
                continue

            if mtype == "text":
                if live is None:
                    await _send(
                        websocket,
                        {
                            "type": "error",
                            "message": "Send start before text",
                            "retryable": False,
                        },
                    )
                    continue
                try:
                    await live.send_text(str(msg.get("text") or ""))
                except Exception as exc:
                    await _send(
                        websocket,
                        {
                            "type": "error",
                            "message": f"Text send failed: {exc}",
                            "retryable": True,
                        },
                    )
                continue

            await _send(
                websocket,
                {
                    "type": "error",
                    "message": f"Unknown message type: {mtype}",
                    "retryable": False,
                },
            )

    except WebSocketDisconnect:
        logger.info("Browser disconnected from live-vision WS")
    except Exception:
        logger.exception("live-vision WS error")
        try:
            await _send(
                websocket,
                {"type": "error", "message": "Gateway failure", "retryable": True},
            )
        except Exception:
            pass
    finally:
        if live is not None:
            await live.close()
        if live_task and not live_task.done():
            live_task.cancel()
            try:
                await live_task
            except (asyncio.CancelledError, Exception):
                pass
        if keepalive_task and not keepalive_task.done():
            keepalive_task.cancel()
            try:
                await keepalive_task
            except (asyncio.CancelledError, Exception):
                pass
        try:
            await _send(websocket, {"type": "closed"})
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass
