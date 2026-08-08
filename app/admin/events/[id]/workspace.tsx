"use client";

import { useState } from "react";
import Link from "next/link";
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
  };
  posts: Post[];
  registrations: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    rsvp_status: string;
    rsvp_at: string | null;
    chat_token: string;
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
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    purple: "from-purple-500/10 to-purple-600/5 border-purple-500/20",
    green: "from-green-500/10 to-green-600/5 border-green-500/20",
    amber: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
    rose: "from-rose-500/10 to-rose-600/5 border-rose-500/20",
    cyan: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20",
  };
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br ${colors[accentColor] ?? colors.blue} overflow-hidden transition-all`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 font-semibold">
          <span className="text-lg">{icon}</span>
          {title}
        </span>
        <span
          className={`text-sm transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export default function Workspace({ eventId }: { eventId: string }) {
  const { data, mutate } = useSWR<EventDetail>(`/api/events/${eventId}`, fetcher, {
    refreshInterval: 2000,
  });
  const [generating, setGenerating] = useState(false);
  const [busyImageIndex, setBusyImageIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedCaption, setSelectedCaption] = useState<number | null>(null);

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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <Link href="/admin" className="text-sm opacity-60 hover:opacity-100">
        ← All events
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="mt-1 text-sm opacity-70">
            {event.venue ?? "No venue"} ·{" "}
            {event.starts_at
              ? new Date(event.starts_at).toLocaleString()
              : "no date"}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-50"
        >
          {generating
            ? "⏳ Generating campaign…"
            : posts.length > 0
              ? "🔄 Regenerate campaign"
              : "🚀 Generate campaign"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {posts.length === 0 && !generating && (
        <div className="mt-10 rounded-xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="text-lg font-medium opacity-70">No campaign yet</p>
          <p className="mt-1 text-sm opacity-50">
            Hit &quot;Generate campaign&quot; to create a full social media
            campaign plan for this event.
          </p>
        </div>
      )}

      {/* ── Campaign Strategy Sections ─────────────────────────────────── */}

      {campaignPlan && campaignPlan.campaignSummary && (
        <div className="mt-8 space-y-4">
          {/* Campaign Overview */}
          <CollapsibleSection
            title="Campaign Overview"
            icon="📋"
            defaultOpen={true}
            accentColor="blue"
          >
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {campaignPlan.campaignSummary}
            </p>
            {campaignPlan.targetAudience && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                  Target Audience
                </p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                  {campaignPlan.targetAudience}
                </p>
              </div>
            )}
            {campaignPlan.toneAndVoice && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                  Tone & Voice
                </p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                  {campaignPlan.toneAndVoice}
                </p>
              </div>
            )}
          </CollapsibleSection>

          {/* Campaign Goals & Key Messages */}
          {(campaignPlan.campaignGoals?.length || campaignPlan.keyMessages?.length) && (
            <CollapsibleSection
              title="Goals & Key Messages"
              icon="🎯"
              accentColor="purple"
            >
              {campaignPlan.campaignGoals && campaignPlan.campaignGoals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                    Campaign Goals
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {campaignPlan.campaignGoals.map((goal, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                      >
                        <span className="mt-0.5 text-purple-500">●</span>
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {campaignPlan.keyMessages && campaignPlan.keyMessages.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                    Key Messages
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {campaignPlan.keyMessages.map((msg, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                      >
                        <span className="mt-0.5 text-purple-400">💬</span>
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Platform Strategy */}
          {campaignPlan.platformStrategy && campaignPlan.platformStrategy.length > 0 && (
            <CollapsibleSection
              title="Platform Strategy"
              icon="📱"
              accentColor="cyan"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {campaignPlan.platformStrategy.map((ps, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-neutral-200 bg-white/50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
                  >
                    <p className="font-semibold text-sm">{ps.platform}</p>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                      {ps.rationale}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-700 dark:text-cyan-400">
                        {ps.postingFrequency}
                      </span>
                      <span className="rounded-full bg-neutral-500/10 px-2 py-0.5 text-xs opacity-80">
                        {ps.contentFocus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Campaign Timeline / Phases */}
          {campaignPlan.phases && campaignPlan.phases.length > 0 && (
            <CollapsibleSection
              title="Campaign Timeline"
              icon="📅"
              accentColor="green"
            >
              <div className="relative space-y-4">
                {campaignPlan.phases.map((phase, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-700 dark:text-green-400">
                        {i + 1}
                      </div>
                      {i < (campaignPlan.phases?.length ?? 0) - 1 && (
                        <div className="mt-1 w-0.5 flex-1 bg-green-500/20" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-sm">{phase.name}</p>
                      <span className="inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
                        {phase.dateRange}
                      </span>
                      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                        {phase.objective}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Post Sequence — the core campaign posts */}
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
                    className="rounded-xl border border-neutral-200 bg-white/50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-800/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{post.label}</p>
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                        {post.publishWindow}
                      </span>
                    </div>
                    <p className="mt-1 text-xs opacity-70">{post.platform}</p>
                    <p className="mt-2 text-xs opacity-80">{post.goal}</p>
                    <p className="mt-3 text-sm leading-relaxed">{post.caption}</p>
                    <p className="mt-2 text-xs text-blue-500">
                      {post.hashtags.join(" ")}
                    </p>
                    {post.callToAction && (
                      <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                        CTA: {post.callToAction}
                      </p>
                    )}
                    <p className="mt-3 text-xs opacity-70">Image brief:</p>
                    <p className="mt-1 text-xs opacity-80">{post.imageBrief}</p>
                    <button
                      onClick={() => generateImageForPost(index)}
                      disabled={busyImageIndex !== null}
                      className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                    >
                      {busyImageIndex === index ? "Generating image…" : "Generate image"}
                    </button>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Engagement Strategy */}
          {campaignPlan.engagementStrategy && campaignPlan.engagementStrategy.length > 0 && (
            <CollapsibleSection
              title="Engagement Strategy"
              icon="💡"
              accentColor="rose"
            >
              <ul className="space-y-2">
                {campaignPlan.engagementStrategy.map((tactic, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    <span className="mt-0.5 text-rose-400">✦</span>
                    {tactic}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Content Calendar */}
          {campaignPlan.contentCalendar && campaignPlan.contentCalendar.length > 0 && (
            <CollapsibleSection
              title="Content Calendar"
              icon="🗓️"
              accentColor="green"
            >
              <div className="space-y-3">
                {campaignPlan.contentCalendar.map((week, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-neutral-200 bg-white/50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50"
                  >
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                      {week.week}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {week.activities.map((activity, j) => (
                        <li key={j} className="text-xs text-neutral-600 dark:text-neutral-400">
                          • {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* KPIs & Metrics */}
          {campaignPlan.kpiMetrics && campaignPlan.kpiMetrics.length > 0 && (
            <CollapsibleSection
              title="KPIs & Metrics"
              icon="📊"
              accentColor="purple"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-300 text-xs uppercase opacity-60 dark:border-neutral-700">
                      <th className="py-2 pr-4">Metric</th>
                      <th className="py-2 pr-4">Target</th>
                      <th className="py-2">How to Measure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignPlan.kpiMetrics.map((kpi, i) => (
                      <tr
                        key={i}
                        className="border-b border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="py-2 pr-4 font-medium">{kpi.metric}</td>
                        <td className="py-2 pr-4 text-purple-600 dark:text-purple-400">
                          {kpi.target}
                        </td>
                        <td className="py-2 text-xs opacity-80">{kpi.howToMeasure}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* ── Post Selection & Scheduling (existing flow) ────────────── */}

      {posts.length > 0 && (
        <>
          <section className="mt-8">
            <h2 className="font-semibold">
              1 · Pick an image{" "}
              <span className="text-sm font-normal opacity-60">
                then a caption, then save the pair
              </span>
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedImage(post.variant_index)}
                  disabled={!post.image_url}
                  className={`overflow-hidden rounded-xl border-2 text-left transition-colors ${
                    selectedImage === post.variant_index
                      ? "border-blue-500"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={`Variant ${post.variant_index + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full animate-pulse items-center justify-center bg-neutral-200 text-xs opacity-60 dark:bg-neutral-800">
                      generating…
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-semibold">2 · Pick a caption</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedCaption(post.variant_index)}
                  disabled={!post.caption}
                  className={`rounded-xl border-2 p-4 text-left text-sm transition-colors ${
                    selectedCaption === post.variant_index
                      ? "border-blue-500"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {post.caption ?? (
                    <span className="animate-pulse opacity-60">generating…</span>
                  )}
                  {post.hashtags.length > 0 && (
                    <span className="mt-2 block text-xs text-blue-500">
                      {post.hashtags.join(" ")}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={savePair}
              disabled={selectedImage === null || selectedCaption === null}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Save pair
            </button>
          </section>

          {chosen && (
            <ChosenPost
              key={`${chosen.id}:${chosen.final_caption}`}
              post={chosen}
              onSaved={() => mutate()}
            />
          )}
        </>
      )}

      <RegistrationsTable registrations={data.registrations} />
    </main>
  );
}

// ── Registrations Table ─────────────────────────────────────────────────

const RSVP_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/15 text-green-600 dark:text-green-400",
  declined: "bg-red-500/15 text-red-600 dark:text-red-400",
  pending: "bg-neutral-500/15 opacity-80",
};

function RegistrationsTable({
  registrations,
}: {
  registrations: EventDetail["registrations"];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyLink(reg: EventDetail["registrations"][number]) {
    await navigator.clipboard.writeText(
      `${window.location.origin}/chat/${reg.chat_token}`
    );
    setCopiedId(reg.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <section className="mt-10 border-t border-neutral-300 pt-6 dark:border-neutral-700">
      <h2 className="font-semibold">
        Registrations{" "}
        <span className="text-sm font-normal opacity-60">
          {registrations.length} · live, updates every 2s
        </span>
      </h2>
      {registrations.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">
          No registrations yet — share the Google Form to collect them.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-xs uppercase opacity-60 dark:border-neutral-700">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">RSVP</th>
                <th className="py-2">Chat link</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr
                  key={reg.id}
                  className="border-b border-neutral-200 dark:border-neutral-800"
                >
                  <td className="py-2 pr-4">{reg.full_name ?? "—"}</td>
                  <td className="py-2 pr-4 opacity-80">{reg.email ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        RSVP_STYLES[reg.rsvp_status] ?? RSVP_STYLES.pending
                      }`}
                    >
                      {reg.rsvp_status}
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => copyLink(reg)}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:border-blue-500 dark:border-neutral-700"
                    >
                      {copiedId === reg.id ? "Copied!" : "Copy link"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Chosen Post (scheduling) ────────────────────────────────────────────

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
    <section className="mt-8 rounded-xl border border-blue-500/50 p-5">
      <h2 className="font-semibold">3 · Your post</h2>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Chosen"
            className="h-48 w-48 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={saveCaption}
              disabled={!dirty || busy !== null}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy === "caption" ? "Saving…" : "Save caption"}
            </button>
            {post.hashtags.length > 0 && (
              <span className="text-xs text-blue-500">
                {post.hashtags.join(" ")}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-neutral-300 pt-4 dark:border-neutral-700">
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
            />
            <button
              onClick={schedule}
              disabled={!dueAt || busy !== null}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy === "schedule" ? "Saving…" : "Schedule"}
            </button>
            {post.scheduled_at && (
              <span className="text-xs opacity-70">
                Scheduled for {new Date(post.scheduled_at).toLocaleString()}
              </span>
            )}
            {notice && <span className="text-xs opacity-70">{notice}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
