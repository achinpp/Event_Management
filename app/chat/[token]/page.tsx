"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{
    token: string;
  } | null>(null);

  if (!resolvedParams) {
    params.then(setResolvedParams);
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <ChatUI token={resolvedParams.token} />;
}

function ChatUI({ token }: { token: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const validatedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Validate the token on mount (one-time check).
  useEffect(() => {
    if (validatedRef.current) return;
    validatedRef.current = true;

    fetch(`/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: token + "_validate",
        messages: [{ role: "user", content: "hello" }],
      }),
    }).then(async (res) => {
      // We use a slightly-modified token to check validity without invoking the model.
      // A 404 means the original token is also likely invalid.
      // Actually, let's just check with the real token — the response will be discarded.
      await res.body?.cancel();
    });

    // Separately check with a lightweight GET-style validation:
    fetch(`/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        messages: [],
      }),
    }).then(async (res) => {
      if (res.status === 404) {
        setError("Invalid or expired chat link.");
      }
      await res.body?.cancel();
    });
  }, [token]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token,
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) {
          throw new Error("Chat request failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
        };
        setMessages((prev) => [...prev, assistantMsg]);

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Check for RSVP confirmations in the text
          if (
            fullText.includes("attendance is confirmed") ||
            fullText.includes("RSVP has been confirmed")
          ) {
            setRsvpStatus("confirmed");
          } else if (
            fullText.includes("sorry you can't make it") ||
            fullText.includes("RSVP has been updated")
          ) {
            setRsvpStatus("declined");
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: fullText } : m
            )
          );
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, isLoading, messages, token]
  );

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold mb-2">Invalid Chat Link</h1>
          <p className="text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl shrink-0">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm">
              💬
            </div>
            <div>
              <h1 className="text-sm font-semibold">Event Assistant</h1>
              <p className="text-[10px] text-zinc-500">
                Ask me anything about the event
              </p>
            </div>
          </div>
          {rsvpStatus && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                rsvpStatus === "confirmed"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {rsvpStatus === "confirmed" ? "✓ Confirmed" : "✗ Declined"}
            </span>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-lg font-semibold mb-2">Welcome!</h2>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Ask me anything about the event — schedule, venue, speakers, or
                let me know if you&apos;ll be attending!
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  "What time does it start?",
                  "Is parking available?",
                  "I'll be there!",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="text-xs border border-zinc-700 rounded-full px-3 py-1.5 text-zinc-400 hover:border-blue-500/50 hover:text-blue-400 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-zinc-800 text-zinc-200 rounded-bl-md border border-zinc-700/50"
                }`}
              >
                {msg.content || (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* RSVP success banner */}
      {rsvpStatus && (
        <div
          className={`shrink-0 px-4 py-3 text-center text-sm font-medium ${
            rsvpStatus === "confirmed"
              ? "bg-emerald-500/10 text-emerald-400 border-t border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border-t border-red-500/20"
          }`}
        >
          {rsvpStatus === "confirmed"
            ? "🎉 Your attendance has been confirmed!"
            : "Your RSVP has been updated."}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800/60 bg-[#09090b] shrink-0">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl px-4 py-3 flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
