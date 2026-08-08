"""
Live Form Vision — Gemini multimodal movement detection + form cues.

Images are analyzed in-memory and discarded; nothing is persisted.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from pydantic import BaseModel, Field, field_validator


class FormVisionResult(BaseModel):
    detected_exercise: str = Field(..., min_length=1, max_length=120)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    matches_logged: bool = False
    form_score: str = Field(default="unknown")  # good | needs_work | poor | unknown
    faults: list[str] = Field(default_factory=list)
    cues: list[str] = Field(default_factory=list)
    summary: str = Field(default="")
    powered_by: str = "Gemini"

    @field_validator("form_score")
    @classmethod
    def normalize_score(cls, v: str) -> str:
        allowed = {"good", "needs_work", "poor", "unknown"}
        key = (v or "unknown").strip().lower().replace(" ", "_").replace("-", "_")
        return key if key in allowed else "unknown"


def gemini_available() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def _model_name() -> str:
    return os.getenv("GEMINI_VISION_MODEL", "gemini-2.0-flash").strip() or "gemini-2.0-flash"


def _normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (name or "").lower())


def _names_match(a: str, b: str) -> bool:
    na, nb = _normalize_name(a), _normalize_name(b)
    if not na or not nb:
        return False
    return na == nb or na in nb or nb in na


def _snap_to_catalog(detected: str, catalog: list[str]) -> str:
    if not detected:
        return "Unknown"
    if not catalog:
        return detected.strip()
    for name in catalog:
        if _names_match(detected, name):
            return name
    # Fuzzy: prefer catalog entry that shares the most significant token
    det_tokens = set(re.findall(r"[a-z0-9]+", detected.lower()))
    best, best_score = detected.strip(), 0
    for name in catalog:
        tokens = set(re.findall(r"[a-z0-9]+", name.lower()))
        score = len(det_tokens & tokens)
        if score > best_score:
            best, best_score = name, score
    return best if best_score >= 1 else detected.strip()


def _build_prompt(
    logged_exercise: str | None,
    catalog: list[str],
    prior_detection: str | None,
) -> str:
    catalog_preview = ", ".join(catalog[:80]) if catalog else "(none provided)"
    logged = logged_exercise or "(not provided)"
    prior = prior_detection or "(none)"
    return f"""You are IronLog Live Vision, a strength-training form coach analyzing camera frames of a lifter.

Tasks:
1. Identify the PRIMARY strength movement being performed from body position and equipment.
2. Prefer a name from the exercise catalog when it clearly matches. If none fit, use a clear common name.
3. The logged exercise is a HINT ONLY — do NOT force-match it. Detect what is actually happening.
4. Critique form briefly: concrete faults and 1–3 actionable coaching cues.
5. Not medical advice. If unclear, say so with low confidence.

Logged exercise (hint only): {logged}
Prior detection (hint): {prior}
Exercise catalog: {catalog_preview}

Respond with ONLY valid JSON (no markdown) matching this schema:
{{
  "detected_exercise": "string",
  "confidence": 0.0,
  "form_score": "good|needs_work|poor|unknown",
  "faults": ["string"],
  "cues": ["string"],
  "summary": "one short sentence"
}}
"""


def _parse_model_json(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        data = json.loads(match.group(0))
        if isinstance(data, dict):
            return data
    raise ValueError("Model did not return valid JSON")


def analyze_form_vision(
    images_b64: list[str],
    *,
    logged_exercise: str | None = None,
    catalog: list[str] | None = None,
    prior_detection: str | None = None,
) -> FormVisionResult:
    """
    Analyze 1–3 JPEG frames (base64, no data-URL prefix) with Gemini.
    Raises RuntimeError if Gemini is unavailable or the call fails.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    if not images_b64:
        raise ValueError("At least one image is required")

    catalog = catalog or []
    prompt = _build_prompt(logged_exercise, catalog, prior_detection)

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError("google-genai package not installed") from exc

    client = genai.Client(api_key=api_key)
    parts: list[Any] = [types.Part.from_text(text=prompt)]
    for img in images_b64:
        parts.append(
            types.Part.from_bytes(
                data=__import__("base64").b64decode(img),
                mime_type="image/jpeg",
            )
        )

    response = client.models.generate_content(
        model=_model_name(),
        contents=types.Content(role="user", parts=parts),
        config=types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    text = getattr(response, "text", None) or ""
    if not text and getattr(response, "candidates", None):
        try:
            text = response.candidates[0].content.parts[0].text
        except (IndexError, AttributeError, TypeError):
            text = ""

    data = _parse_model_json(text)
    detected_raw = str(data.get("detected_exercise") or "Unknown").strip()
    detected = _snap_to_catalog(detected_raw, catalog)
    confidence = float(data.get("confidence") or 0.0)
    confidence = max(0.0, min(1.0, confidence))
    faults = [str(f).strip() for f in (data.get("faults") or []) if str(f).strip()][:6]
    cues = [str(c).strip() for c in (data.get("cues") or []) if str(c).strip()][:3]
    summary = str(data.get("summary") or "").strip()[:400]
    form_score = str(data.get("form_score") or "unknown")

    matches = bool(logged_exercise) and _names_match(detected, logged_exercise)

    return FormVisionResult(
        detected_exercise=detected,
        confidence=confidence,
        matches_logged=matches,
        form_score=form_score,
        faults=faults,
        cues=cues or (["Keep core braced and control the eccentric."] if form_score != "good" else ["Looking solid — stay consistent."]),
        summary=summary or f"Detected {detected}.",
        powered_by=f"Gemini ({_model_name()})",
    )
