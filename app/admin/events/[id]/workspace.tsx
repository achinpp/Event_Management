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
  caption: string;
  hashtags: string[];
  imageBrief: string;
}

interface CampaignPlan {
  campaignSummary: string;
  postSequence: PlannedPost[];
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
  const generatingRows = posts.some((p) => p.image_url === null);

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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
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
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {generating
            ? "Generating…"
            : posts.length > 0
              ? "Regenerate campaign"
              : "Generate campaign"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {posts.length === 0 && !generating && (
        <p className="mt-10 text-sm opacity-70">
          No campaign yet — hit Generate to create your event campaign.
        </p>
      )}

      {campaignPlan && (
        <section className="mt-8 rounded-xl border border-neutral-300 p-5 dark:border-neutral-700">
          <h2 className="font-semibold">Campaign plan</h2>
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
            {campaignPlan.campaignSummary}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {campaignPlan.postSequence.map((post, index) => (
              <div
                key={post.type}
                className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{post.label}</p>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-700">
                    {post.publishWindow}
                  </span>
                </div>
                <p className="mt-2 text-xs opacity-80">{post.goal}</p>
                <p className="mt-3 text-sm">{post.caption}</p>
                <p className="mt-2 text-xs text-blue-500">
                  {post.hashtags.join(" ")}
                </p>
                <p className="mt-3 text-xs opacity-70">Image brief:</p>
                <p className="mt-1 text-xs opacity-80">{post.imageBrief}</p>
                <button
                  onClick={() => generateImageForPost(index)}
                  disabled={busyImageIndex !== null}
                  className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busyImageIndex === index ? "Generating image…" : "Generate image"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <>
          <section className="mt-8">
            <h2 className="font-semibold">
              1 · Pick an image{" "}
              <span className="text-sm font-normal opacity-60">
                then a caption, then save the pair
              </span>
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
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
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
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
