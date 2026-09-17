"""
Gemini Live WebSocket client — server-side only (API key never leaves Athletyx).

Provides resilient connect with exponential backoff, optional session resumption
handle, GoAway awareness, and helpers to send JPEG frames / text / tool responses.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
from collections.abc import Awaitable, Callable
from typing import Any

logger = logging.getLogger("athletyx.gemini_live")

OnEvent = Callable[[dict[str, Any]], Awaitable[None] | None]

SYSTEM_INSTRUCTION = """You are IronLog Live Vision Coach over a live camera feed.
Goals:
1) Continuously infer the primary strength movement from video frames.
2) Name the lift clearly (prefer the provided exercise catalog when it fits).
3) Give short, glanceable form cues (≤12 words). Not medical advice.
4) When confident, call report_detected_exercise with structured fields.
If framing is poor (person tiny/cropped/blurry), say so and ask for a side/full-body view.
"""

REPORT_EXERCISE_TOOL = {
    "function_declarations": [
        {
            "name": "report_detected_exercise",
            "description": "Report the detected lift and form snapshot from the live camera.",
            "parameters": {
                "type": "object",
                "properties": {
                    "detected_exercise": {"type": "string"},
                    "confidence": {"type": "number"},
                    "form_score": {
                        "type": "string",
                        "enum": ["good", "needs_work", "poor", "unknown"],
                    },
                    "faults": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "cues": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "summary": {"type": "string"},
                },
                "required": ["detected_exercise", "confidence"],
            },
        }
    ]
}


def gemini_live_model() -> str:
    return (
        os.getenv("GEMINI_LIVE_MODEL", "gemini-2.0-flash-live-001").strip()
        or "gemini-2.0-flash-live-001"
    )


def gemini_live_available() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def _build_connect_config(
    *,
    logged_exercise: str | None,
    catalog: list[str],
    resume_handle: str | None,
):
    from google.genai import types

    catalog_preview = ", ".join(catalog[:40]) if catalog else "(none)"
    logged = logged_exercise or "(not provided)"
    instruction = (
        SYSTEM_INSTRUCTION
        + f"\nLogged exercise (hint only): {logged}"
        + f"\nExercise catalog: {catalog_preview}"
    )

    kwargs: dict[str, Any] = {
        "response_modalities": ["TEXT"],
        "system_instruction": types.Content(
            parts=[types.Part(text=instruction)]
        ),
        "tools": [REPORT_EXERCISE_TOOL],
    }

    # Session resumption when the SDK / API supports it
    if resume_handle:
        try:
            kwargs["session_resumption"] = types.SessionResumptionConfig(
                handle=resume_handle
            )
        except (TypeError, AttributeError, ValueError):
            logger.warning("SessionResumptionConfig unavailable; connecting fresh")

    try:
        return types.LiveConnectConfig(**kwargs)
    except TypeError:
        # Older SDKs: drop optional fields
        kwargs.pop("session_resumption", None)
        kwargs.pop("tools", None)
        return types.LiveConnectConfig(**kwargs)


class GeminiLiveSession:
    """
    Manages one Gemini Live session with reconnect/backoff.

    Call `run()` to own the connection lifecycle. Push frames via `send_jpeg_b64`.
    """

    def __init__(
        self,
        *,
        on_event: OnEvent,
        logged_exercise: str | None = None,
        catalog: list[str] | None = None,
        resume_handle: str | None = None,
        max_retries: int = 5,
        initial_backoff_s: float = 1.5,
        max_backoff_s: float = 30.0,
    ):
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")

        self._api_key = api_key
        self._on_event = on_event
        self._logged_exercise = logged_exercise
        self._catalog = catalog or []
        self._resume_handle = resume_handle
        self._max_retries = max_retries
        self._initial_backoff = initial_backoff_s
        self._max_backoff = max_backoff_s

        self._session = None
        self._send_lock = asyncio.Lock()
        self._closed = False
        self._go_away = False
        self.session_id: str | None = None
        self.frames_sent = 0
        self.last_frame_bytes = 0

    async def _emit(self, payload: dict[str, Any]) -> None:
        try:
            result = self._on_event(payload)
            if asyncio.iscoroutine(result):
                await result
        except Exception:
            logger.exception("on_event failed")

    async def run(self) -> None:
        attempt = 0
        backoff = self._initial_backoff
        while not self._closed and not self._go_away:
            try:
                await self._connect_and_pump()
                if self._closed or self._go_away:
                    break
                # Clean close from Google without GoAway — try resume once cycle
                attempt += 1
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                attempt += 1
                retryable = attempt <= self._max_retries
                await self._emit(
                    {
                        "type": "error",
                        "message": str(exc),
                        "retryable": retryable,
                        "attempt": attempt,
                    }
                )
                if not retryable:
                    break
                await self._emit(
                    {
                        "type": "reconnecting",
                        "attempt": attempt,
                        "backoff_s": backoff,
                    }
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, self._max_backoff)
                continue
            # Unexpected exit from pump without exception
            if attempt > self._max_retries:
                break
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, self._max_backoff)

    async def _connect_and_pump(self) -> None:
        from google import genai

        client = genai.Client(api_key=self._api_key)
        config = _build_connect_config(
            logged_exercise=self._logged_exercise,
            catalog=self._catalog,
            resume_handle=self._resume_handle,
        )
        model = gemini_live_model()
        logger.info("Connecting Gemini Live model=%s", model)

        async with client.aio.live.connect(model=model, config=config) as session:
            self._session = session
            self.session_id = getattr(session, "session_id", None)
            await self._emit(
                {
                    "type": "ready",
                    "sessionId": self.session_id,
                    "model": model,
                    "resumeHandle": self._resume_handle,
                }
            )
            async for message in session.receive():
                if self._closed:
                    break
                await self._handle_server_message(message)

        self._session = None

    async def _handle_server_message(self, message: Any) -> None:
        # Text
        text = getattr(message, "text", None)
        if text:
            await self._emit({"type": "model_text", "text": text})

        # Tool calls
        tool_call = getattr(message, "tool_call", None)
        if tool_call:
            fns = getattr(tool_call, "function_calls", None) or []
            for fc in fns:
                name = getattr(fc, "name", None) or ""
                args = getattr(fc, "args", None) or {}
                call_id = getattr(fc, "id", None)
                if isinstance(args, dict):
                    payload_args = args
                else:
                    try:
                        payload_args = dict(args)
                    except Exception:
                        payload_args = {"raw": str(args)}
                await self._emit(
                    {
                        "type": "tool_call",
                        "name": name,
                        "args": payload_args,
                        "id": call_id,
                    }
                )
                # Auto-ack tool response so the Live turn can continue
                await self._send_tool_response(call_id, name, payload_args)

        # GoAway
        go_away = getattr(message, "go_away", None)
        if go_away is not None:
            self._go_away = True
            time_left = getattr(go_away, "time_left", None)
            await self._emit(
                {
                    "type": "go_away",
                    "timeLeft": str(time_left) if time_left is not None else None,
                }
            )

        # Session resumption update
        sr = getattr(message, "session_resumption_update", None)
        if sr is not None:
            handle = getattr(sr, "new_handle", None) or getattr(sr, "handle", None)
            if handle:
                self._resume_handle = handle
                await self._emit({"type": "resumption_handle", "handle": handle})

    async def _send_tool_response(
        self, call_id: str | None, name: str, args: dict[str, Any]
    ) -> None:
        if not self._session:
            return
        try:
            from google.genai import types

            response = types.FunctionResponse(
                id=call_id,
                name=name,
                response={"ok": True, "received": args},
            )
            async with self._send_lock:
                send_fn = getattr(self._session, "send_tool_response", None)
                if send_fn:
                    await send_fn(function_responses=[response])
                else:
                    # Fallback older API shapes
                    await self._session.send(
                        input=types.LiveClientToolResponse(
                            function_responses=[response]
                        )
                    )
        except Exception:
            logger.exception("Failed to ack tool response")

    async def send_jpeg_b64(self, data_b64: str, mime_type: str = "image/jpeg") -> None:
        if self._closed or not self._session:
            raise RuntimeError("Live session not connected")
        raw = data_b64.strip()
        if "," in raw and raw.lower().startswith("data:"):
            raw = raw.split(",", 1)[1]
        if not raw or len(raw) < 32:
            raise ValueError("Invalid JPEG payload")
        try:
            blob = base64.b64decode(raw, validate=False)
        except Exception as exc:
            raise ValueError("Corrupt base64 frame") from exc
        if len(blob) < 100:
            raise ValueError("Frame too small")
        if len(blob) > 2_500_000:
            raise ValueError("Frame exceeds 2.5MB limit")

        self.last_frame_bytes = len(blob)
        self.frames_sent += 1

        from google.genai import types

        async with self._send_lock:
            send_realtime = getattr(self._session, "send_realtime_input", None)
            if send_realtime:
                await send_realtime(
                    media=types.Blob(data=blob, mime_type=mime_type or "image/jpeg")
                )
            else:
                await self._session.send(
                    input=types.Blob(data=blob, mime_type=mime_type or "image/jpeg")
                )

    async def send_text(self, text: str, *, turn_complete: bool = True) -> None:
        if self._closed or not self._session:
            raise RuntimeError("Live session not connected")
        text = (text or "").strip()
        if not text:
            return
        async with self._send_lock:
            send_realtime = getattr(self._session, "send_realtime_input", None)
            if send_realtime and not turn_complete:
                await send_realtime(text=text)
                return
            # Client content turn
            try:
                await self._session.send_client_content(
                    turns={"role": "user", "parts": [{"text": text}]},
                    turn_complete=turn_complete,
                )
            except AttributeError:
                await self._session.send(input=text, end_of_turn=turn_complete)

    async def send_ping_keepalive(self) -> None:
        """Lightweight activity to reduce idle drops when no frames are flowing."""
        try:
            await self.send_text(".", turn_complete=False)
        except Exception:
            logger.debug("keepalive skipped", exc_info=True)

    async def close(self) -> None:
        self._closed = True
        self._session = None
