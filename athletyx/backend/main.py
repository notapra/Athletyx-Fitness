from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.agent import route_message

app = FastAPI(title="Athletyx API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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


@app.get("/health")
def health():
    return {"status": "ok", "service": "athletyx"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    result = route_message(request.message)
    return ChatResponse(**result)
