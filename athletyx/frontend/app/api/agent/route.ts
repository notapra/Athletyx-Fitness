/**
 * Next.js Route Handler — server-side only LLM boundary.
 *
 * Why API route (not client):
 * - OPENAI_API_KEY never exposed to browser
 * - Central place for rate limits, auth, logging, eval traces
 *
 * AI engineer: compare with IronLog's client-side aiService (offline-first) vs this server agent.
 */

import { NextResponse } from "next/server";
import {
  runAthletyxAgent,
  type ChatTurn,
} from "@/services/langchainService";

// LangChain + OpenAI SDK require Node APIs (not Edge)
export const runtime = "nodejs";

type AgentRequestBody = {
  message?: string;
  history?: ChatTurn[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AgentRequestBody;
    const message = body.message?.trim() ?? "";

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const history = Array.isArray(body.history) ? body.history : [];
    const content = await runAthletyxAgent(message, history);

    return NextResponse.json({
      role: "assistant",
      content,
      provider: "langchain",
      model: "gpt-4o-mini",
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Agent request failed";
    console.error("[athletyx/agent]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
