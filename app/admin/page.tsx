"use client";

import { useState } from "react";
import useSWR from "swr";

interface Event {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  venue: string | null;
  status: string;
  created_at: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminPage() {
  const { data, mutate, isLoading } = useSWR<{ events: Event[] }>(
    "/api/events",
    fetcher
  );
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    venue: "",
    starts_at: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    logo_url: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v.trim()) body[k] = v.trim();
    }
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setForm({
          title: "",
          description: "",
          venue: "",
          starts_at: "",
          contact_name: "",
          contact_email: "",
          contact_phone: "",
          logo_url: "",
        });
        setShowForm(false);
        mutate();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold">
              E
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              EventPilot
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            {showForm ? "Cancel" : "+ New Event"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* New Event Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4 animate-in fade-in duration-200"
          >
            <h2 className="text-lg font-semibold">Create New Event</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Title *
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="TechFusion 2026"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Venue
                </label>
                <input
                  value={form.venue}
                  onChange={(e) =>
                    setForm({ ...form, venue: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="Cinnamon Grand, Colombo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) =>
                    setForm({ ...form, starts_at: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Logo URL
                </label>
                <input
                  value={form.logo_url}
                  onChange={(e) =>
                    setForm({ ...form, logo_url: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
                placeholder="A one-day AI and robotics summit..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Contact Name
                </label>
                <input
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm({ ...form, contact_name: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm({ ...form, contact_email: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Contact Phone
                </label>
                <input
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm({ ...form, contact_phone: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Creating..." : "Create Event"}
              </button>
            </div>
          </form>
        )}

        {/* Events List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-zinc-800 bg-zinc-900/30 animate-pulse"
              />
            ))}
          </div>
        ) : !data?.events?.length ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🎪</div>
            <p className="text-zinc-400">No events yet. Create your first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.events.map((event) => (
              <a
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {event.title}
                  </h3>
                  <span
                    className={`shrink-0 ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      event.status === "draft"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
                {event.description && (
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-4">
                    {event.description}
                  </p>
                )}
                <div className="space-y-1.5 text-xs text-zinc-500">
                  {event.venue && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-600">📍</span> {event.venue}
                    </div>
                  )}
                  {event.starts_at && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-600">📅</span>{" "}
                      {new Date(event.starts_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
