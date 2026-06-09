"""
Athletyx HTTP API — IronLog integration + legacy chat router.

- POST /api/coach — RAG + SerpAPI + personalization (IronLog IronCoach)
- POST /api/chat — deterministic tool router (legacy)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.agent import route_message
from backend.coaching_service import coach_with_athletyx

app = FastAPI(title="Athletyx API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "athletyx",
        "features": ["rag", "serpapi", "personalization", "ironlog_coach"],
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    result = route_message(request.message)
    return ChatResponse(**result)


@app.post("/api/coach", response_model=CoachResponse)
async def coach(request: CoachRequest):
    result = await coach_with_athletyx(
        request.message,
        request.profile,
        request.goals,
        request.analysis,
        use_web_search=request.use_web_search,
    )
    return CoachResponse(**result)
