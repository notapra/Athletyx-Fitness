"use client";

import { FormEvent, KeyboardEvent } from "react";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

function MicIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 11v1a7 7 0 0 1-14 0v-1M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
}: ChatInputProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!disabled && value.trim()) onSend();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pb-6 pt-12">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto mx-auto max-w-2xl px-4 md:px-8"
      >
        <div className="input-glow flex items-end gap-2 rounded-full border border-slate-800/80 bg-slate-900/80 p-2 pl-5 shadow-glow backdrop-blur-xl transition-shadow duration-300">
          <textarea
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Log a set or ask for a workout…"
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
            aria-label="Message Athletyx"
          />
          <button
            type="button"
            disabled
            title="Voice coming soon"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 opacity-60"
            aria-label="Voice input (coming soon)"
          >
            <MicIcon />
          </button>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/90 text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}
