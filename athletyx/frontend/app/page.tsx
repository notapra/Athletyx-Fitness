"use client";

import { useCallback, useState } from "react";
import ChatViewport, { type ChatMessage } from "@/components/ChatViewport";
import ChatInput from "@/components/ChatInput";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function createId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type ChatApiResponse = {
  role: string;
  content: string;
  tool_used?: string | null;
  tool_args?: Record<string, unknown> | null;
};

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ChatApiResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: data.content,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content:
            "Could not reach Athletyx backend. Start the API with `uvicorn backend.main:app --reload` from the **athletyx** folder.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="shrink-0 border-b border-slate-800/60 px-4 py-5 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">
              Athletyx
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Minimal inputs · rich outputs
            </p>
          </div>
          <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-400/90">
            Beta
          </span>
        </div>
      </header>

      <ChatViewport
        messages={messages}
        isLoading={isLoading}
        onSuggestionClick={sendMessage}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => sendMessage(input)}
        disabled={isLoading}
      />
    </div>
  );
}
