import { NextResponse } from "next/server";
import {
  runAthletyxAgent,
  type ChatTurn,
} from "@/services/langchainService";

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
