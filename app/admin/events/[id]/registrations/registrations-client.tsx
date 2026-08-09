"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";

interface EventDetail {
  event: {
    id: string;
    title: string;
    description: string | null;
    starts_at: string | null;
    venue: string | null;
    status: string;
  };
  registrations: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    rsvp_status: string;
    rsvp_at: string | null;
    chat_token: string;
    created_at: string;
  }>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const RSVP_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
  declined: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  pending: "bg-zinc-500/10 text-zinc-650 dark:text-zinc-400 border border-zinc-500/20 opacity-80",
};

export default function RegistrationsClient({ eventId }: { eventId: string }) {
  const { data, error, isLoading } = useSWR<EventDetail>(
    `/api/events/${eventId}`,
    fetcher,
    {
      refreshInterval: 2000,
    }
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center">
        <p className="text-sm opacity-70 animate-pulse">Loading registrations…</p>
      </div>
    );
  }

  if (error || !data || !data.event) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-red-500 font-semibold">Failed to load registration data.</p>
        <Link href="/admin" className="mt-4 text-xs font-semibold text-indigo-500 hover:underline">
          Go back to Admin Home
        </Link>
      </div>
    );
  }

  const { event, registrations } = data;

  // Statistics calculation
  const totalCount = registrations.length;
  const confirmedCount = registrations.filter((r) => r.rsvp_status === "confirmed").length;
  const declinedCount = registrations.filter((r) => r.rsvp_status === "declined").length;
  const pendingCount = registrations.filter((r) => r.rsvp_status === "pending").length;

  // Filtered registrations
  const filteredRegs = registrations.filter((reg) => {
    const term = search.toLowerCase();
    return (
      (reg.full_name ?? "").toLowerCase().includes(term) ||
      (reg.email ?? "").toLowerCase().includes(term)
    );
  });

  async function copyLink(reg: typeof registrations[number]) {
    await navigator.clipboard.writeText(
      `${window.location.origin}/chat/${reg.chat_token}`
    );
    setCopiedId(reg.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/50 bg-white/85 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/admin" className="flex items-center gap-2 font-sans text-xl font-bold tracking-tight">
            <svg
              className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent dark:from-zinc-100 dark:to-zinc-400">
              EventPilot Console
            </span>
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              View Landing Page
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-6 py-10">
        
        {/* Glow Blobs */}
        <div className="absolute top-20 left-10 -z-10 h-[300px] w-[300px] rounded-full bg-indigo-500/5 blur-[120px] dark:bg-indigo-500/10" />
        <div className="absolute bottom-20 right-10 -z-10 h-[250px] w-[250px] rounded-full bg-cyan-500/5 blur-[100px] dark:bg-cyan-500/10" />

        {/* Back Link */}
        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 mb-6"
        >
          <span>←</span> Back to Event Console
        </Link>

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Attendee Registrations
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Manage registrants for <span className="font-semibold text-zinc-850 dark:text-zinc-200">{event.title}</span>. Attendees can confirm RSVP via their AI chatbot.
            </p>
          </div>
          <span className="text-[10px] self-start md:self-center font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">
            🔄 Live updates (2s)
          </span>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total Signups</span>
            <p className="text-2xl font-black mt-1 text-zinc-850 dark:text-zinc-50">{totalCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Confirmed (RSVP)</span>
            <p className="text-2xl font-black mt-1 text-green-600 dark:text-green-400">{confirmedCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Declined</span>
            <p className="text-2xl font-black mt-1 text-red-650 dark:text-red-400">{declinedCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Pending</span>
            <p className="text-2xl font-black mt-1 text-zinc-500 dark:text-zinc-450">{pendingCount}</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-6 max-w-md">
          <div className="relative flex items-center">
            <svg className="absolute left-3.5 h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by attendee name or email..."
              className="w-full rounded-xl border border-zinc-200 bg-white/70 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 text-xs text-zinc-400 hover:text-zinc-650"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Registrations List */}
        {registrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
            <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-4 text-sm font-semibold opacity-70">No registrations captured yet</p>
            <p className="mt-1 text-xs opacity-50">
              Submit attendee signups via Google Form or seed data manually to list them.
            </p>
          </div>
        ) : filteredRegs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
            <p className="text-sm font-semibold opacity-70">No matching search results</p>
            <p className="mt-1 text-xs opacity-50">Try checking for typos or clear the search filter.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white/40 dark:bg-zinc-900/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-100/80 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-6 py-4">Attendee Name</th>
                    <th className="px-6 py-4">Email Address</th>
                    <th className="px-6 py-4">RSVP Status</th>
                    <th className="px-6 py-4">Registration Date</th>
                    <th className="px-6 py-4">Public Chat Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredRegs.map((reg) => (
                    <tr key={reg.id} className="hover:bg-white/30 dark:hover:bg-zinc-950/10 transition-colors">
                      <td className="px-6 py-4 font-semibold text-zinc-850 dark:text-zinc-100">{reg.full_name ?? "—"}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{reg.email ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                            RSVP_STYLES[reg.rsvp_status] ?? RSVP_STYLES.pending
                          }`}
                        >
                          {reg.rsvp_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(reg.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => copyLink(reg)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all focus:outline-none ${
                            copiedId === reg.id
                              ? "border-green-500/35 bg-green-500/10 text-green-600 dark:text-green-400"
                              : "border-zinc-200 bg-white hover:border-zinc-455 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                          }`}
                        >
                          {copiedId === reg.id ? (
                            <>
                              <span>✓</span> Copied Link!
                            </>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                              </svg>
                              Copy Chat Link
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
