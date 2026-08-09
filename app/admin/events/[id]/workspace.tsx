"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- generated/remote images, no next/image optimization needed */
import useSWR from "swr";

interface Post {
  id: string;
  variant_index: number;
  image_url: string | null;
  caption: string | null;
  hashtags: string[];
  final_caption: string | null;
  status: string;
  scheduled_at: string | null;
  penpot_url?: string | null;
  penpot_file_id?: string | null;
}

interface PlannedPost {
  label: string;
  type: string;
  goal: string;
  publishWindow: string;
  platform: string;
  caption: string;
  hashtags: string[];
  imageBrief: string;
  callToAction: string;
}

interface PlatformStrategy {
  platform: string;
  rationale: string;
  postingFrequency: string;
  contentFocus: string;
}

interface Phase {
  name: string;
  dateRange: string;
  objective: string;
  postIndices: number[];
}

interface KPI {
  metric: string;
  target: string;
  howToMeasure: string;
}

interface ContentWeek {
  week: string;
  activities: string[];
}

interface CampaignPlan {
  campaignSummary: string;
  targetAudience?: string;
  campaignGoals?: string[];
  keyMessages?: string[];
  toneAndVoice?: string;
  platformStrategy?: PlatformStrategy[];
  phases?: Phase[];
  postSequence?: PlannedPost[];
  engagementStrategy?: string[];
  contentCalendar?: ContentWeek[];
  kpiMetrics?: KPI[];
}

interface EventDetail {
  event: {
    id: string;
    title: string;
    description: string | null;
    starts_at: string | null;
    venue: string | null;
    status: string;
    breakdown?: CampaignPlan | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    logo_url?: string | null;
    invite_lead_days?: number;
  };
  posts: Post[];
  registrations: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    rsvp_status: string;
    rsvp_at: string | null;
    chat_token: string;
    created_at: string;
  }>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Collapsible Section Component ───────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
  accentColor = "blue",
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colors: Record<string, string> = {
    blue: "from-blue-500/5 to-indigo-500/5 border-blue-500/10 dark:border-blue-500/20",
    purple: "from-purple-500/5 to-violet-500/5 border-purple-500/10 dark:border-purple-500/20",
    green: "from-green-500/5 to-emerald-500/5 border-green-500/10 dark:border-green-500/20",
    amber: "from-amber-500/5 to-orange-500/5 border-amber-500/10 dark:border-amber-500/20",
    rose: "from-rose-500/5 to-pink-500/5 border-rose-500/10 dark:border-rose-500/20",
    cyan: "from-cyan-500/5 to-teal-500/5 border-cyan-500/10 dark:border-cyan-500/20",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${colors[accentColor] ?? colors.blue} overflow-hidden transition-all`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus:outline-none"
      >
        <span className="flex items-center gap-2.5 font-bold text-zinc-800 dark:text-zinc-100 text-sm">
          <span className="text-lg">{icon}</span>
          {title}
        </span>
        <span
          className={`text-xs text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {open && <div className="px-5 pb-5 animate-fadeIn">{children}</div>}
    </div>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export default function Workspace({ eventId }: { eventId: string }) {
  const { data, mutate } = useSWR<EventDetail>(`/api/events/${eventId}`, fetcher, {
    refreshInterval: 2000,
  });
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [busyImageIndex, setBusyImageIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedCaption, setSelectedCaption] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!data) {
    return <main className="p-10 text-sm opacity-70">Loading…</main>;
  }
  if (!data.event) {
    return <main className="p-10 text-sm text-red-500">Event not found.</main>;
  }

  const { event, posts } = data;
  const campaignPlan = event.breakdown;
  const chosen = posts.find((p) => p.final_caption !== null) ?? null;

  async function generate() {
    setGenerating(true);
    setError(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? `generate failed (${res.status})`);
    }
    setGenerating(false);
    mutate();
  }

  async function savePair() {
    if (selectedImage === null || selectedCaption === null) return;
    const imageRow = posts.find((p) => p.variant_index === selectedImage);
    const captionRow = posts.find((p) => p.variant_index === selectedCaption);
    if (!imageRow || !captionRow?.caption) return;
    setError(null);
    // Clear any previously chosen row, then mark the selected image row with
    // the selected caption text as its final_caption.
    for (const p of posts) {
      if (p.final_caption !== null && p.id !== imageRow.id) {
        await fetch(`/api/posts/${p.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ final_caption: null }),
        });
      }
    }
    const res = await fetch(`/api/posts/${imageRow.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ final_caption: captionRow.caption }),
    });
    if (!res.ok) setError("saving pair failed");
    setSelectedImage(null);
    setSelectedCaption(null);
    mutate();
  }

  async function generateImageForPost(postIndex: number) {
    if (!campaignPlan?.postSequence?.[postIndex]) return;
    const post = posts[postIndex];
    if (!post) return;
    setBusyImageIndex(postIndex);
    setError(null);

    const res = await fetch(`/api/posts/${post.id}/generate-image`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageBrief: campaignPlan.postSequence[postIndex].imageBrief }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.error ?? "Image generation failed");
    }

    setBusyImageIndex(null);
    mutate();
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this event? This action will permanently remove all generated campaigns, registrations, and knowledge chunks.")) {
      return;
    }
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Delete failed");
      setDeleting(false);
    } else {
      router.push("/admin");
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const startsAt = formData.get("starts_at") as string;
    const body = {
      title: formData.get("title"),
      description: formData.get("description"),
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      venue: (formData.get("venue") as string) || null,
      contact_name: (formData.get("contact_name") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      invite_lead_days: Number(formData.get("invite_lead_days") ?? 7),
    };
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Save failed");
    } else {
      setIsEditing(false);
      mutate();
    }
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

      {/* Main Workspace Frame */}
      <main className="relative mx-auto w-full max-w-7xl px-6 py-10">
        
        {/* Glow Blobs */}
        <div className="absolute top-20 left-10 -z-10 h-[300px] w-[300px] rounded-full bg-violet-650/5 blur-[120px] dark:bg-violet-650/10" />
        <div className="absolute bottom-20 right-10 -z-10 h-[250px] w-[250px] rounded-full bg-cyan-500/5 blur-[100px] dark:bg-cyan-500/10" />

        {/* Back Link */}
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200">
          <span>←</span> Back to Dashboard
        </Link>

        {/* Event Detail Banner Card */}
        <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/70 p-6 shadow-md backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {event.title}
                </h1>
                
                {/* Status badge */}
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  event.status === "active" || event.status === "published"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400"
                }`}>
                  {event.status}
                </span>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {event.venue && (
                  <span className="flex items-center gap-1.5">
                    {/* Location Pin */}
                    <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {event.venue}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  {/* Calendar Icon */}
                  <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {event.starts_at ? new Date(event.starts_at).toLocaleString() : "No Date Scheduled"}
                </span>
                
                {(event.contact_name || event.contact_email) && (
                  <span className="flex items-center gap-1.5">
                    {/* User Icon */}
                    <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.contact_name ?? "Organizer"} ({event.contact_email ?? "No Email"})
                  </span>
                )}
              </div>
            </div>

            {/* Actions Block */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-850"
              >
                ✏️ Edit Details
              </button>
              
              <Link
                href={`/admin/events/${eventId}/registrations`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-850"
              >
                👥 Registrations ({data.registrations.length})
              </Link>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/10 dark:border-red-500/10 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                {deleting ? "Deleting…" : "🗑️ Delete"}
              </button>
              
              <button
                onClick={generate}
                disabled={generating}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 px-5 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.01] hover:shadow-indigo-500/15 disabled:opacity-50"
              >
                {generating ? (
                  "⏳ Generating campaign…"
                ) : posts.length > 0 ? (
                  <>
                    <span>🔄</span> Regenerate Campaign
                  </>
                ) : (
                  <>
                    <span>🚀</span> Generate Campaign
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-550/5 p-4 text-xs font-semibold text-red-500 dark:border-red-500/10">{error}</p>}

        {/* Empty Campaign State */}
        {posts.length === 0 && !generating && (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
            <svg
              className="mx-auto h-12 w-12 text-zinc-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7C4.68 9.58 4.634 10.7 4.634 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.092-1.209.138-2.43.138-3.662z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
            </svg>
            <p className="mt-4 text-sm font-semibold opacity-70">No campaign generated yet</p>
            <p className="mt-1 text-xs opacity-50">
              Click &quot;Generate Campaign&quot; in the header card to outline targeted post schedules and RAG parameters.
            </p>
          </div>
        )}

        {/* ── Campaign Strategy Collapsibles ────────────────────────────── */}

        {campaignPlan && campaignPlan.campaignSummary && (
          <div className="mt-8 space-y-4">
            
            {/* 1. Overview */}
            <CollapsibleSection
              title="Campaign Overview"
              icon="📋"
              defaultOpen={true}
              accentColor="blue"
            >
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-350">
                {campaignPlan.campaignSummary}
              </p>
              
              <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-zinc-200/40 dark:border-zinc-800/40 pt-4">
                {campaignPlan.targetAudience && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Target Audience</span>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{campaignPlan.targetAudience}</p>
                  </div>
                )}
                {campaignPlan.toneAndVoice && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Tone & Voice</span>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{campaignPlan.toneAndVoice}</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* 2. Goals & Key Messages */}
            {(campaignPlan.campaignGoals?.length || campaignPlan.keyMessages?.length) && (
              <CollapsibleSection
                title="Goals & Key Messages"
                icon="🎯"
                accentColor="purple"
              >
                <div className="grid gap-6 md:grid-cols-2">
                  {campaignPlan.campaignGoals && campaignPlan.campaignGoals.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Campaign Goals</span>
                      <ul className="mt-2.5 space-y-2">
                        {campaignPlan.campaignGoals.map((goal, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-350">
                            <span className="mt-1 text-[8px] text-violet-500">●</span>
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {campaignPlan.keyMessages && campaignPlan.keyMessages.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Key Messages</span>
                      <ul className="mt-2.5 space-y-2">
                        {campaignPlan.keyMessages.map((msg, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-350">
                            <span className="mt-0.5 text-xs text-violet-500">💬</span>
                            {msg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* 3. Platform Strategy */}
            {campaignPlan.platformStrategy && campaignPlan.platformStrategy.length > 0 && (
              <CollapsibleSection
                title="Platform Strategies"
                icon="📱"
                accentColor="cyan"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {campaignPlan.platformStrategy.map((ps, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-zinc-200 bg-white/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20"
                    >
                      <h4 className="font-bold text-sm text-zinc-850 dark:text-zinc-150">{ps.platform}</h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {ps.rationale}
                      </p>
                      
                      <div className="mt-3.5 flex flex-wrap gap-2">
                        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                          ⏱️ {ps.postingFrequency}
                        </span>
                        <span className="rounded-full bg-zinc-200/50 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                          🎯 Focus: {ps.contentFocus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* 4. Timeline Phases */}
            {campaignPlan.phases && campaignPlan.phases.length > 0 && (
              <CollapsibleSection
                title="Campaign Timeline"
                icon="📅"
                accentColor="green"
              >
                <div className="relative pl-6 space-y-5 border-l-2 border-green-500/20 dark:border-green-500/10 ml-3 py-1">
                  {campaignPlan.phases.map((phase, i) => (
                    <div key={i} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-4 ring-white dark:ring-zinc-950" />
                      
                      <div>
                        <h4 className="font-bold text-sm text-zinc-850 dark:text-zinc-150">{phase.name}</h4>
                        <span className="mt-1 inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                          📅 {phase.dateRange}
                        </span>
                        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {phase.objective}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* 5. Campaign Posts sequence */}
            {campaignPlan.postSequence && campaignPlan.postSequence.length > 0 && (
              <CollapsibleSection
                title={`Campaign Posts (${campaignPlan.postSequence.length})`}
                icon="📝"
                defaultOpen={true}
                accentColor="amber"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {campaignPlan.postSequence.map((post, index) => (
                    <div
                      key={post.type}
                      className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white/40 p-5 dark:border-zinc-800 dark:bg-zinc-950/20"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2.5 mb-3">
                          <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{post.label}</span>
                          <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {post.publishWindow}
                          </span>
                        </div>
                        
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Platform Strategy</span>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">{post.platform} · {post.goal}</p>
                        
                        <p className="mt-3.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-350">{post.caption}</p>
                        <p className="mt-2 text-xs text-indigo-500 dark:text-indigo-400">
                          {post.hashtags.join(" ")}
                        </p>
                        
                        {post.callToAction && (
                          <p className="mt-3 text-xs font-bold text-amber-600 dark:text-amber-400">
                            CTA: {post.callToAction}
                          </p>
                        )}
                        
                        <div className="mt-4 border-t border-zinc-200/40 dark:border-zinc-800/40 pt-3 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Visual Graphic Prompt</span>
                          <p className="mt-1 text-zinc-500 dark:text-zinc-400 leading-normal">{post.imageBrief}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-2">
                        <button
                          onClick={() => generateImageForPost(index)}
                          disabled={busyImageIndex !== null}
                          className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-500 disabled:opacity-50"
                        >
                          {busyImageIndex === index ? "⏳ Synthesizing graphic..." : "🎨 Generate Image (Penpot AI)"}
                        </button>
                        {posts[index]?.penpot_url && (
                          <a
                            href={posts[index].penpot_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-500/10 py-2 text-xs font-bold text-pink-600 transition-all hover:bg-pink-500/20 dark:text-pink-400"
                          >
                            <span>✏️</span> Edit in Penpot Canvas
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* 6. Engagement Tactics */}
            {campaignPlan.engagementStrategy && campaignPlan.engagementStrategy.length > 0 && (
              <CollapsibleSection
                title="Engagement Strategy"
                icon="💡"
                accentColor="rose"
              >
                <ul className="space-y-2">
                  {campaignPlan.engagementStrategy.map((tactic, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-350">
                      <span className="mt-1 text-[8px] text-rose-500">✦</span>
                      {tactic}
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {/* 7. Weekly Calendar */}
            {campaignPlan.contentCalendar && campaignPlan.contentCalendar.length > 0 && (
              <CollapsibleSection
                title="Content Calendar"
                icon="🗓️"
                accentColor="green"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {campaignPlan.contentCalendar.map((week, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-zinc-200 bg-white/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20"
                    >
                      <h4 className="font-bold text-sm text-green-600 dark:text-green-400">{week.week}</h4>
                      <ul className="mt-2.5 space-y-1.5">
                        {week.activities.map((activity, j) => (
                          <li key={j} className="text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5">
                            <span className="mt-1 text-[6px] opacity-60">•</span>
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* 8. KPIs & Success Indicators */}
            {campaignPlan.kpiMetrics && campaignPlan.kpiMetrics.length > 0 && (
              <CollapsibleSection
                title="KPIs & Success metrics"
                icon="📊"
                accentColor="purple"
              >
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60 dark:border-zinc-800 dark:text-zinc-400">
                        <th className="px-5 py-3">Metric</th>
                        <th className="px-5 py-3">Target</th>
                        <th className="px-5 py-3">How to Measure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {campaignPlan.kpiMetrics.map((kpi, i) => (
                        <tr key={i} className="hover:bg-white/30 dark:hover:bg-zinc-950/10">
                          <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">{kpi.metric}</td>
                          <td className="px-5 py-3.5 text-violet-600 font-bold dark:text-violet-400">{kpi.target}</td>
                          <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 leading-normal">{kpi.howToMeasure}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            )}

          </div>
        )}

        {/* ── Campaign Assembly Grid Section ────────────────────────────── */}

        {posts.length > 0 && (
          <div className="mt-12 space-y-12">
            
            {/* Segment Header */}
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Campaign Assembly Console</h2>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Match generated graphics with corresponding captions to compile a chosen post, then schedule dispatch times.
              </p>
            </div>

            {/* Grid selectors */}
            <div className="grid gap-8 lg:grid-cols-12">
              
              {/* Asset list (col-span-5) */}
              <section className="lg:col-span-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">
                  1 · Choose Visual Asset
                </h3>
                
                <div className="grid gap-3 grid-cols-2">
                  {posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedImage(post.variant_index)}
                      disabled={!post.image_url}
                      className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-all ${
                        selectedImage === post.variant_index
                          ? "border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.25)] scale-[1.01]"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-650"
                      }`}
                    >
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt={`Variant ${post.variant_index + 1}`}
                          className="aspect-square w-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex aspect-square w-full animate-pulse items-center justify-center bg-zinc-200 text-xs font-semibold opacity-60 dark:bg-zinc-900">
                          pending graphic…
                        </div>
                      )}
                      
                      {/* Check badge */}
                      {selectedImage === post.variant_index && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white text-[10px]">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Caption list (col-span-7) */}
              <section className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">
                    2 · Choose Caption Copy
                  </h3>
                  
                  <div className="grid gap-3">
                    {posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedCaption(post.variant_index)}
                        disabled={!post.caption}
                        className={`rounded-2xl border-2 p-4 text-left text-sm transition-all focus:outline-none ${
                          selectedCaption === post.variant_index
                            ? "border-indigo-500 bg-indigo-500/[0.02] shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.005]"
                            : "border-zinc-200 bg-white/30 dark:border-zinc-800 dark:bg-zinc-900/10 hover:border-zinc-350 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-zinc-200/40 dark:border-zinc-800/40 pb-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Variant {post.variant_index + 1}</span>
                          {selectedCaption === post.variant_index && (
                            <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">Selected</span>
                          )}
                        </div>
                        
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {post.caption ?? <span className="animate-pulse opacity-60">pending AI captions…</span>}
                        </p>
                        
                        {post.hashtags.length > 0 && (
                          <span className="mt-2 block text-xs font-semibold text-indigo-500 dark:text-indigo-400">
                            {post.hashtags.join(" ")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <button
                    onClick={savePair}
                    disabled={selectedImage === null || selectedCaption === null}
                    className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 px-6 py-3 text-sm font-bold text-white shadow-md hover:scale-[1.01] hover:shadow-indigo-500/20 disabled:opacity-40"
                  >
                    Save As Chosen Pair
                  </button>
                </div>
              </section>

            </div>

            {/* 3. Chosen post Scheduling Card (Simulated Composer) */}
            {chosen && (
              <ChosenPost
                key={`${chosen.id}:${chosen.final_caption}`}
                post={chosen}
                onSaved={() => mutate()}
              />
            )}

          </div>
        )}



      </main>

      {/* Edit Event Details Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-350 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 animate-fadeIn">
            <h2 className="text-xl font-bold">Edit Event Details</h2>
            <form onSubmit={handleSave} className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase opacity-60">Event Title</label>
                <input
                  name="title"
                  required
                  defaultValue={event.title}
                  className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase opacity-60">Description (Chatbot Knowledge Base)</label>
                <textarea
                  name="description"
                  required
                  rows={5}
                  defaultValue={event.description ?? ""}
                  placeholder="Describe details for chatbot training..."
                  className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase opacity-60">Starts At</label>
                  <input
                    name="starts_at"
                    type="datetime-local"
                    defaultValue={event.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : ""}
                    className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase opacity-60">Venue</label>
                  <input
                    name="venue"
                    defaultValue={event.venue ?? ""}
                    className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase opacity-60">Contact Name</label>
                  <input
                    name="contact_name"
                    defaultValue={event.contact_name ?? ""}
                    className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase opacity-60">Contact Email</label>
                  <input
                    name="contact_email"
                    type="email"
                    defaultValue={event.contact_email ?? ""}
                    className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase opacity-60">Contact Phone</label>
                  <input
                    name="contact_phone"
                    defaultValue={event.contact_phone ?? ""}
                    className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase opacity-60">WhatsApp Invite Lead Days (days before event to send invitations)</label>
                  <input
                    name="invite_lead_days"
                    type="number"
                    min="0"
                    max="90"
                    required
                    defaultValue={event.invite_lead_days ?? 7}
                    className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3 border-t border-neutral-200 dark:border-neutral-700 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? "Saving Changes…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Chosen Post (scheduling card - Twitter/LinkedIn Mockup) ─────────────

function ChosenPost({ post, onSaved }: { post: Post; onSaved: () => void }) {
  const [draft, setDraft] = useState(post.final_caption ?? "");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dirty = draft !== post.final_caption;

  async function saveCaption() {
    setBusy("caption");
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ final_caption: draft }),
    });
    setBusy(null);
    onSaved();
  }

  async function schedule() {
    if (!dueAt) return;
    setBusy("schedule");
    setNotice(null);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        postId: post.id,
        dueAt: new Date(dueAt).toISOString(),
      }),
    });
    setBusy(null);
    setNotice(res.ok ? "Scheduled time saved." : "Scheduling failed.");
    onSaved();
  }

  return (
    <section className="mt-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.01] p-6 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-400 mb-4">
        3 · Schedule Dispatch
      </h3>
      
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Mock Post Composer image */}
        {post.image_url && (
          <div className="w-full lg:w-48 shrink-0 flex flex-col gap-2">
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-150">
              <img
                src={post.image_url}
                alt="Chosen"
                className="h-48 w-48 w-full object-cover"
              />
            </div>
            {post.penpot_url && (
              <div className="flex flex-col gap-1.5">
                <a
                  href={post.penpot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-1.5 text-xs font-bold text-pink-600 hover:bg-pink-500/20 dark:text-pink-400 transition-all"
                >
                  <span>✏️</span> Edit in Penpot
                </a>
                <button
                  onClick={async () => {
                    setBusy("reexport");
                    await fetch(`/api/posts/${post.id}/reexport`, { method: "POST" });
                    setBusy(null);
                    onSaved();
                  }}
                  disabled={busy !== null}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  <span>🔄</span> Re-Sync Graphic
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Mock Composer Panel */}
        <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-850 dark:bg-zinc-950/60 shadow-sm flex flex-col justify-between">
          <div>
            {/* mock header profile */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 text-xs font-bold text-white">
                EP
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50">EventPilot Scheduler</h4>
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500">Linked Social Channels</p>
              </div>
            </div>
            
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/20 px-3.5 py-2.5 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/10 focus:ring-1 focus:ring-indigo-500"
            />
            
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={saveCaption}
                disabled={!dirty || busy !== null}
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {busy === "caption" ? "Saving…" : "Save Edited Caption"}
              </button>
              {post.hashtags.length > 0 && (
                <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">
                  {post.hashtags.join(" ")}
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-200/50 pt-4 dark:border-zinc-800/50 text-xs">
            <div className="grid gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Dispatch Time</span>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800"
              />
            </div>
            
            <button
              onClick={schedule}
              disabled={!dueAt || busy !== null}
              className="mt-4 rounded-lg bg-gradient-to-r from-violet-650 to-indigo-650 px-4 py-2 text-xs font-bold text-white hover:scale-[1.01] disabled:opacity-40"
            >
              {busy === "schedule" ? "Scheduling…" : "Schedule with Buffer"}
            </button>
            
            {post.scheduled_at && (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400">
                <span>✓</span> Scheduled: {new Date(post.scheduled_at).toLocaleString()}
              </span>
            )}
            
            {notice && <span className="mt-4 text-xs font-medium opacity-70">{notice}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
