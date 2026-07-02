"""
Athletyx HTTP API — IronLog integration + legacy chat router.

Production: set SUPABASE_URL, SUPABASE_ANON_KEY, REQUIRE_AUTH=true, CORS_ORIGINS
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.coaching_service import coach_with_athletyx, serpapi_available
from backend.agent import route_message
from backend.auth_middleware import get_cors_origins, get_current_user
from backend.logging_middleware import RequestLoggingMiddleware
from backend.query_cache import get_cache_stats

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "PRIVATE.env"))

app = FastAPI(title="Athletyx API", version="0.3.0")

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    role: str
    content: str
    tool_used: str | None = None
    tool_args: dict | None = None


class CoachRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    profile: dict = Field(default_factory=dict)
    goals: list[dict] = Field(default_factory=list)
    analysis: dict | None = None
    use_web_search: bool | None = None


class CoachResponse(BaseModel):
    content: str
    powered_by: str | None = "Athletyx"
    personalization_applied: str | None = None
    citations: list[dict] = Field(default_factory=list)
    search_trace: dict = Field(default_factory=dict)
    sources: dict = Field(default_factory=dict)
    tool_used: str | None = None
    from_cache: bool | None = None
    cache: dict = Field(default_factory=dict)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "athletyx",
        "features": ["rag", "personalization", "ironlog_coach", "jwt_auth", "query_cache"]
        + (["serpapi"] if serpapi_available() else []),
        "auth_required": os.getenv("REQUIRE_AUTH", "false"),
        "web_search_available": serpapi_available(),
        "openai_available": bool(os.getenv("OPENAI_API_KEY", "").strip()),
        "cache": get_cache_stats(),
    }


@app.get("/api/coach/cache-stats")
def coach_cache_stats():
    return get_cache_stats()


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    result = route_message(request.message)
    return ChatResponse(**result)


@app.post("/api/coach", response_model=CoachResponse)
async def coach(
    request: CoachRequest,
    user: dict | None = Depends(get_current_user),
):
    profile = request.profile
    if user:
        profile = {**profile, "id": user.get("id"), "email": user.get("email")}
    result = await coach_with_athletyx(
        request.message,
        profile,
        request.goals,
        request.analysis,
        use_web_search=request.use_web_search,
    )
    return CoachResponse(**result)
