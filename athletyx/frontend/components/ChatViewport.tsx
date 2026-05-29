"use client";

import { useEffect, useRef } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatViewportProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  onSuggestionClick: (text: string) => void;
};

const SUGGESTIONS = [
  "Plan a hypertrophy push workout",
  "hit bench 225 for 8, 8, 6",
  "strength legs routine",
];

function formatContent(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='rounded bg-slate-800/80 px-1 py-0.5 text-emerald-200/90'>$1</code>")
    .replace(/\n/g, "<br />");
}

export default function ChatViewport({
  messages,
  isLoading,
  onSuggestionClick,
}: ChatViewportProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const showEmpty = messages.length === 0 && !isLoading;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 pb-32 pt-6 md:px-8"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Athletyx
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
              Train through conversation
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
              Log sets in plain English or ask for a program — no forms, no clutter.
            </p>
            <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSuggestionClick(s)}
                  className="rounded-full border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[85%] ${
                msg.role === "user"
                  ? "bg-slate-800/90 text-slate-50 ring-1 ring-slate-700/50"
                  : "bg-slate-900/60 text-slate-200 ring-1 ring-slate-800/80 prose-chat"
              }`}
              {...(msg.role === "assistant"
                ? {
                    dangerouslySetInnerHTML: {
                      __html: formatContent(msg.content),
                    },
                  }
                : {})}
            >
              {msg.role === "user" ? msg.content : null}
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="message-in flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-900/60 px-4 py-3 ring-1 ring-slate-800/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/80" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/60 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/40 [animation-delay:300ms]" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
