"use client";

// /rules #3: messages live ONLY in this component's React state and are sent
// with each request. Nothing is persisted server-side.

import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Status {
  event: { title: string };
  registration: { full_name: string | null; rsvp_status: string };
}

const SUGGESTIONS = [
  "Is parking available?",
  "What time does it start?",
  "I'll be there!",
];

function PlaneMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

export default function Chat({ token }: { token: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshStatus = useCallback(async () => {
    const res = await fetch(`/api/chat?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      setInvalid(true);
      return;
    }
    setStatus(await res.json());
  }, [token]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(text: string) {
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, messages: history }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`chat failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        const snapshot = assistant;
        setMessages([...history, { role: "assistant", content: snapshot }]);
      }
      if (!assistant.trim()) {
        setMessages([
          ...history,
          {
            role: "assistant",
            content: "Sorry, something went wrong — try again?",
          },
        ]);
      }
    } catch {
      setMessages([
        ...history,
        {
          role: "assistant",
          content: "Sorry, something went wrong — try again?",
        },
      ]);
    }
    setSending(false);
    refreshStatus(); // pick up RSVP changes made via the tool call
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    submit(input.trim());
  }

  if (invalid) {
    return (
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 px-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="pointer-events-none absolute top-1/3 left-1/2 -z-10 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px] dark:bg-violet-600/15" />
        <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/70 p-8 text-center shadow-xl backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
            <PlaneMark className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            This chat link isn&apos;t valid
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Check the link in your registration message, or ask the organizers
            for a fresh one.
          </p>
        </div>
      </div>
    );
  }

  const rsvp = status?.registration.rsvp_status;
  const firstName = status?.registration.full_name?.split(" ")[0];

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Ambient glow, matching the landing page hero treatment */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px] dark:bg-violet-600/15" />
      <div className="pointer-events-none absolute top-1/3 left-1/4 -z-10 h-[300px] w-[320px] rounded-full bg-cyan-500/10 blur-[100px] dark:bg-cyan-500/15" />

      {/* Glass header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 bg-white/85 backdrop-blur-md transition-colors duration-300 dark:border-zinc-800/50 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <PlaneMark className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            {status ? (
              <h1 className="truncate text-sm font-bold tracking-tight">
                {status.event.title}
              </h1>
            ) : (
              <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            )}
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              Event assistant{firstName ? ` · for ${firstName}` : ""}
            </p>
          </div>
          {rsvp === "confirmed" && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Going
            </span>
          )}
          {rsvp === "declined" && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-550 ring-1 ring-zinc-300/60 ring-inset dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-700/60">
              Not going
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5">
        {/* RSVP confirmation banner */}
        {rsvp === "confirmed" && (
          <div className="animate-riseIn mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:from-emerald-950/30 dark:to-teal-950/20">
            <span className="text-lg leading-none">🎉</span>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                You&apos;re confirmed — see you there!
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/70">
                Changed your plans? Just tell me and I&apos;ll update it.
              </p>
            </div>
          </div>
        )}
        {rsvp === "declined" && (
          <div className="animate-riseIn mt-5 rounded-2xl border border-zinc-200 bg-white/60 p-4 text-sm text-zinc-600 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
            You&apos;ve declined this invitation — changed your mind? Just say so.
          </div>
        )}

        {/* Conversation */}
        <div className="flex-1 space-y-4 py-6">
          {messages.length === 0 && (
            <div className="animate-fadeIn pt-6 text-center">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-600/10 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                <PlaneMark className="h-6 w-6" />
              </div>
              <p className="text-base font-bold tracking-tight">
                Hi{firstName ? ` ${firstName}` : ""} — ask me anything
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                I know this event&apos;s schedule, venue and logistics. I can
                also save your RSVP.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="cursor-pointer rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:border-indigo-500/40 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-indigo-400/40 dark:hover:text-indigo-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="mt-auto mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                  <PlaneMark className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`animate-fadeIn max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "rounded-br-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/15"
                    : "rounded-bl-md border border-zinc-200/80 bg-white text-zinc-800 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900 dark:text-zinc-200"
                }`}
              >
                {m.content || (
                  <span className="flex gap-1 py-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form
          onSubmit={send}
          className="sticky bottom-0 flex gap-2 border-t border-zinc-200/50 bg-zinc-50/90 py-4 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/90"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the event…"
            className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.03] hover:shadow-indigo-600/35 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <svg
              className="h-4.5 w-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </main>
    </div>
  );
}
