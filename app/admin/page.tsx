"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { InteractiveEventDatePicker } from "@/components/interactive-event-date-picker";

interface EventRow {
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (res.status === 401 || data?.error === "Unauthorized") {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  return data;
};

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];

export default function AdminPage() {
  const { data, isLoading, mutate } = useSWR<{ events: EventRow[] }>(
    "/api/events",
    fetcher
  );
  const { data: userData } = useSWR<{ user: { email: string; id: string } | null }>(
    "/api/auth/me",
    fetcher
  );
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setLogoError("Invalid image format! Only PNG, JPEG, WEBP, and SVG files are allowed.");
      e.target.value = "";
      return;
    }

    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  async function createEvent(formData: FormData) {
    setCreating(true);
    setFormError(null);
    const startsAt = formData.get("starts_at") as string;
    const body = {
      title: formData.get("title"),
      description: formData.get("description"),
      starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
      venue: (formData.get("venue") as string) || undefined,
      contact_name: (formData.get("contact_name") as string) || undefined,
      contact_email: (formData.get("contact_email") as string) || undefined,
      contact_phone: (formData.get("contact_phone") as string) || undefined,
      logo_url: logoUrl || undefined,
    };
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setFormError(json.error ?? `request failed (${res.status})`);
      return;
    }
    mutate();
    router.push(`/admin/events/${json.event.id}`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      
      {/* 1. Glassmorphic Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 bg-white/85 backdrop-blur-md transition-colors duration-300 dark:border-zinc-800/50 dark:bg-zinc-950/85">
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

          <nav className="flex items-center gap-6">
            {userData?.user && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 select-none">
                Logged in as <strong className="text-zinc-700 dark:text-zinc-300">{userData.user.email}</strong>
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer focus:outline-none"
            >
              Sign Out
            </button>
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              View Landing Page
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative mx-auto w-full max-w-7xl px-6 py-10">
        
        {/* Glow Details */}
        <div className="absolute top-20 right-10 -z-10 h-[300px] w-[300px] rounded-full bg-violet-600/5 blur-[100px] dark:bg-violet-600/10" />
        <div className="absolute bottom-20 left-10 -z-10 h-[250px] w-[250px] rounded-full bg-cyan-500/5 blur-[80px] dark:bg-cyan-500/10" />

        {/* Dashboard Title & Tagline */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-900 dark:text-zinc-50">
            Orchestration Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Create an event, configure descriptions for the chatbot knowledge base, and generate multi-day social campaign timelines.
          </p>
        </div>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* LEFT COLUMN: Event Creation Form (lg:col-span-5) */}
          <section className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-md transition-colors duration-300 dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">New Event Setup</h2>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-550">
                Register a new event. The description acts as the chatbot&apos;s primary training base.
              </p>
              
              <form action={createEvent} className="mt-6 grid gap-4">
                
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Event Title</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Summit 2026"
                    className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                  />
                </div>

                {/* Event Logo Upload Field */}
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Event Logo (PNG, JPEG, WEBP, SVG)
                  </label>
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <div className="relative group">
                        <img
                          src={logoUrl}
                          alt="Logo Preview"
                          className="h-12 w-12 rounded-xl object-cover border border-indigo-500/40 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setLogoUrl(null)}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 text-white p-0.5 text-[10px] shadow hover:bg-red-600 transition-colors"
                          title="Remove logo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 text-xs">
                        📷
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={handleLogoFileChange}
                        className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950/60 dark:file:text-indigo-300 cursor-pointer"
                      />
                    </div>
                  </div>
                  {logoError && <p className="text-[11px] font-semibold text-red-500 mt-1">{logoError}</p>}
                </div>

                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Description (AI Knowledge Base)</label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    placeholder="Detail speakers, timings, lunch logistics, tickets, parking rules..."
                    className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5 min-w-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Starts At</label>
                    <InteractiveEventDatePicker name="starts_at" />
                  </div>

                  <div className="grid gap-1.5 min-w-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Venue</label>
                    <input
                      name="venue"
                      placeholder="e.g. Grand Hall, Colombo"
                      className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50 min-w-0"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-200/50 pt-4 dark:border-zinc-800/50 grid gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Organizer Contact Info</span>
                  
                  <div className="grid gap-1.5">
                    <input
                      name="contact_name"
                      placeholder="Contact name"
                      className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="contact_email"
                      type="email"
                      placeholder="Contact email"
                      className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                    />
                    <input
                      name="contact_phone"
                      placeholder="Contact phone"
                      className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                    />
                  </div>
                </div>

                {formError && <p className="mt-1 text-xs text-red-500">{formError}</p>}
                
                <button
                  type="submit"
                  disabled={creating}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.01] hover:shadow-indigo-500/20 disabled:opacity-50"
                >
                  {creating ? "⏳ Creating event..." : "Create Event & Train AI"}
                </button>
              </form>
            </div>
          </section>

          {/* RIGHT COLUMN: Active Event Pilots (lg:col-span-7) */}
          <section className="lg:col-span-7">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">Active Event Pilots</h2>
            
            {/* Loading State */}
            {isLoading && (
              <div className="grid gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-[96px] w-full rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-850 dark:bg-zinc-900/30 animate-pulse" />
                ))}
              </div>
            )}

            {/* List items */}
            {!isLoading && (
              <div className="grid gap-4">
                {data?.events?.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-violet-500/50 hover:shadow-md hover:-translate-y-0.5 dark:border-zinc-850 dark:bg-zinc-900/30 dark:hover:border-violet-500/30"
                  >
                    <div className="flex-1 min-w-0 pr-4 flex items-center gap-3.5">
                      {event.logo_url && (
                        <img
                          src={event.logo_url}
                          alt={`${event.title} Logo`}
                          className="h-10 w-10 shrink-0 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 bg-white shadow-xs"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-850 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                            {event.title}
                          </span>
                          
                          {/* Event status badge */}
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            event.status === "active" || event.status === "published"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400"
                          }`}>
                            {event.status}
                          </span>
                        </div>
                        
                        {/* Venue & Time indicators */}
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {event.venue && (
                            <span className="flex items-center gap-1">
                              {/* MapPin Icon */}
                              <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                              {event.venue}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            {/* Calendar Icon */}
                            <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                            {event.starts_at
                              ? new Date(event.starts_at).toLocaleDateString()
                              : "No scheduled date"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-zinc-350 dark:text-zinc-650 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                      {/* Chevron Right */}
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                ))}

                {/* Empty State */}
                {data?.events?.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
                    <svg
                      className="mx-auto h-12 w-12 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <p className="mt-4 text-sm font-semibold opacity-70">No Event Pilots created yet</p>
                    <p className="mt-1 text-xs opacity-50">Setup your first event in the side panel to train the AI co-pilot.</p>
                  </div>
                )}
              </div>
            )}
          </section>

        </div>

      </main>
      
    </div>
  );
}
