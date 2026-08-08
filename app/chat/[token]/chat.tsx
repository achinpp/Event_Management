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

export default function Chat({ token }: { token: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
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

  if (invalid) {
    return (
      <main className="grid flex-1 place-items-center p-10">
        <p className="text-sm opacity-70">
          This chat link isn&apos;t valid. Check the link in your registration
          email.
        </p>
      </main>
    );
  }

  const rsvp = status?.registration.rsvp_status;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <header className="border-b border-neutral-300 pb-4 dark:border-neutral-700">
        <h1 className="text-lg font-bold">
          {status ? status.event.title : "Loading…"}
        </h1>
        <p className="text-sm opacity-70">
          Ask me anything about the event
          {status?.registration.full_name
            ? `, ${status.registration.full_name}`
            : ""}
          .
        </p>
        {rsvp === "confirmed" && (
          <p className="mt-2 rounded-lg bg-green-500/15 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400">
            🎉 You&apos;re confirmed — see you there!
          </p>
        )}
        {rsvp === "declined" && (
          <p className="mt-2 rounded-lg bg-neutral-500/15 px-3 py-2 text-sm opacity-80">
            You&apos;ve declined — changed your mind? Just say so.
          </p>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="text-sm opacity-50">
            Try: &quot;Is parking available?&quot; or &quot;I&apos;ll be
            there!&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            {m.content || <span className="animate-pulse">…</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-neutral-300 bg-transparent px-4 py-2 text-sm dark:border-neutral-700"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </main>
  );
}
