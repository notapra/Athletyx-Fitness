/**
 * Athletyx LangChain agent — production-style ReAct loop (LangChain v1 createAgent).
 *
 * Stack:
 * - System prompt: domain constraints (hypertrophy science, RPE/RIR, safety).
 * - Tools: query_science_database (RAG placeholder → vector DB in prod).
 * - Model: gpt-4o-mini via @langchain/openai (cost/latency tradeoff for chat).
 *
 * Interview talking points:
 * - ReAct: model may call tools, observe JSON, then synthesize a grounded answer.
 * - Temperature 0.35: slightly creative phrasing, still factual.
 * - History window: last 12 turns to bound token cost.
 */

import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool } from "@langchain/core/tools";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

const SYSTEM_PROMPT = `You are the Athletyx AI Fitness Agent — a science-first strength and hypertrophy coach.

## Identity
- You translate research and expert consensus into practical training decisions.
- You prioritize evidence over bro-science, hype, or anecdote.
- Tone: clear, direct, encouraging, and precise. No fluff.

## Core principles (always apply)
1. **Mechanical tension** is the primary driver of hypertrophy; metabolic stress and muscle damage are secondary.
2. **Progressive overload** via load, reps, sets, or improved technique (e.g., longer muscle lengths, controlled eccentrics).
3. **Volume landmarks** (MEV → MAV → MRV): most lifters grow well with ~10–20 hard sets per muscle per week, individualized by recovery.
4. **RPE / RIR**: prescribe and interpret effort accurately (e.g., RPE 7–9 for most hypertrophy work; RIR 0–3).
5. **Long-length partials & lengthened biases** where appropriate (research-informed emphasis on stretched positions for certain muscles).
6. **Frequency & recovery**: distribute volume across the week; deload when performance, sleep, or motivation trend down.
7. **Exercise selection**: match movements to goals, injury history, and stimulus-to-fatigue ratio.

## Educator alignment
Your reasoning should align with evidence-based educators (e.g., Jeff Nippard, Mike Israetel's volume landmarks, peer-reviewed hypertrophy literature). Cite mechanisms briefly when useful.

## Tool use
- When the user asks for research backing, program rationale, or "what does the science say," call **query_science_database** with a focused search query before answering.
- Integrate tool results into your reply; do not invent study titles or quotes.

## Boundaries
- You are not a medical professional. Flag pain, injury, or red-flag symptoms → see a qualified clinician.
- Do not recommend extreme deficits, PED protocols, or dangerous practices.
- If data is missing, say what you need (training age, goals, schedule, injuries, current lifts).

## Output format
- Short paragraphs or bullets unless the user asks for a full program.
- Include actionable sets/reps/RPE when prescribing.
- End with one concrete next step when appropriate.`;

/**
 * Mock retrieval corpus — simulates chunked transcript index + keyword scoring.
 * Production: embed chunks (OpenAI/Cohere), store in pgvector/Pinecone, hybrid search.
 */
const SCIENCE_LIBRARY: Array<{
  id: string;
  source: string;
  topic: string;
  excerpt: string;
  keywords: string[];
}> = [
  {
    id: "jn-volume-landmarks",
    source: "Volume Landmarks (educator transcript index)",
    topic: "MEV MAV MRV",
    excerpt:
      "Most muscles respond to roughly 10–20 hard sets per week for growth. Below MEV, progress stalls; above MRV, recovery and performance suffer. Adjust by muscle group and recovery.",
    keywords: ["volume", "mrv", "mev", "mav", "sets", "landmarks", "israetel"],
  },
  {
    id: "jn-mechanical-tension",
    source: "Hypertrophy mechanisms (educator transcript index)",
    topic: "Mechanical tension",
    excerpt:
      "Mechanical tension through full ROM and challenging loads is the primary hypertrophy driver. Train close to failure (typically RIR 0–3) on working sets for efficient stimulus.",
    keywords: ["tension", "hypertrophy", "failure", "rir", "rpe", "mechanism"],
  },
  {
    id: "jn-long-length-partials",
    source: "Lengthened partials (educator transcript index)",
    topic: "Long-length partials",
    excerpt:
      "Emphasizing the stretched/lengthened portion of certain exercises (e.g., incline curls, seated cable rows with stretch) can increase hypertrophy stimulus for some muscle groups when volume is equated.",
    keywords: ["partial", "long length", "lengthened", "stretch", "rom"],
  },
  {
    id: "jn-rpe-rir",
    source: "RPE RIR autoregulation (educator transcript index)",
    topic: "RPE RIR",
    excerpt:
      "Use RPE 7–9 or RIR 1–3 on most hypertrophy sets. Autoregulate load day-to-day; if reps fall below target at the same RPE, fatigue or recovery may be limiting.",
    keywords: ["rpe", "rir", "autoregulation", "effort", "intensity"],
  },
  {
    id: "jn-frequency",
    source: "Training frequency (educator transcript index)",
    topic: "Frequency recovery",
    excerpt:
      "Training each muscle 2–3×/week often outperforms once-weekly volume bombs when weekly sets are matched, provided recovery is adequate.",
    keywords: ["frequency", "recovery", "split", "twice", "per week"],
  },
  {
    id: "jn-progressive-overload",
    source: "Progressive overload (educator transcript index)",
    topic: "Progressive overload",
    excerpt:
      "Progress via more load, more reps at the same load, more sets, better technique, or longer ranges of motion. Track performance and add load in small increments when top sets hit target reps at target RPE.",
    keywords: ["progressive", "overload", "progress", "load", "reps"],
  },
];

/** Lightweight lexical ranker — stand-in for dense retrieval + reranker. */
function scoreHit(query: string, entry: (typeof SCIENCE_LIBRARY)[0]): number {
  const q = query.toLowerCase();
  let score = 0;
  for (const kw of entry.keywords) {
    if (q.includes(kw)) score += 2;
  }
  if (q.includes(entry.topic.toLowerCase())) score += 3;
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  for (const w of words) {
    if (entry.excerpt.toLowerCase().includes(w)) score += 1;
  }
  return score;
}

async function simulateScienceQuery(rawQuery: string): Promise<string> {
  const query = rawQuery.trim();
  if (!query) {
    return JSON.stringify({ error: "Empty query", hits: [] });
  }

  const hits = [...SCIENCE_LIBRARY]
    .map((entry) => ({ entry, score: scoreHit(query, entry) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry }) => ({
      id: entry.id,
      source: entry.source,
      topic: entry.topic,
      excerpt: entry.excerpt,
    }));

  const fallback =
    hits.length === 0
      ? [
          {
            id: "general-hypertrophy",
            source: "Athletyx science index (fallback)",
            topic: "General hypertrophy",
            excerpt:
              "Prioritize mechanical tension, adequate weekly volume per muscle (~10–20 hard sets), RPE 7–9, progressive overload, and recovery. Use lengthened-biased exercises where appropriate.",
          },
        ]
      : hits;

  return JSON.stringify({
    query,
    hitCount: fallback.length,
    hits: fallback,
    note: "Simulated retrieval — replace with vector DB over transcript library in production.",
  });
}

/**
 * Agent tool: RAG retrieval step. LLM chooses when to call based on description + user question.
 * Returns JSON string so the model can cite excerpts without fabricating papers.
 */
export const queryScienceDatabaseTool = new DynamicTool({
  name: "query_science_database",
  description:
    "Search the Athletyx indexed science library (educator transcripts, hypertrophy summaries) for evidence-backed excerpts. Input: a short search query string (topic, mechanism, or question). Returns JSON with relevant excerpts.",
  func: async (input: string) => simulateScienceQuery(input),
});

function getChatModel(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to athletyx/frontend/.env.local"
    );
  }

  return new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.35,
    apiKey,
  });
}

type AgentInstance = ReturnType<typeof createAgent>;

// Singleton agent — avoid re-instantiating graph + model client per request (serverless: use caution)
let agentPromise: Promise<AgentInstance> | null = null;

function getAgent(): Promise<AgentInstance> {
  if (!agentPromise) {
    agentPromise = Promise.resolve(
      createAgent({
        model: getChatModel(),
        tools: [queryScienceDatabaseTool],
        systemPrompt: SYSTEM_PROMPT,
      })
    );
  }
  return agentPromise;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function toLangChainMessages(history: ChatTurn[]): BaseMessage[] {
  return history.map((turn) =>
    turn.role === "user"
      ? new HumanMessage(turn.content)
      : new AIMessage(turn.content)
  );
}

function extractAssistantText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg._getType() === "ai") {
      const content = msg.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((block) =>
            typeof block === "string"
              ? block
              : "text" in block && typeof block.text === "string"
                ? block.text
                : ""
          )
          .join("");
      }
    }
  }
  return "I could not generate a response. Please try again.";
}

/**
 * Run the Athletyx science-based agent (LangChain createAgent ReAct chain).
 */
export async function runAthletyxAgent(
  input: string,
  chatHistory: ChatTurn[] = []
): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) {
    return "Ask a training question — volume, RPE, exercise selection, or what the science says.";
  }

  const agent = await getAgent();
  const messages = [...toLangChainMessages(chatHistory.slice(-12)), new HumanMessage(trimmed)];

  const result = await agent.invoke({ messages });

  const outMessages =
    result && typeof result === "object" && "messages" in result && Array.isArray(result.messages)
      ? (result.messages as BaseMessage[])
      : [];

  return extractAssistantText(outMessages);
}

export { SYSTEM_PROMPT };
