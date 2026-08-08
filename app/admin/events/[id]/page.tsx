"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Image from "next/image";

interface Post {
  id: string;
  event_id: string;
  variant_index: number;
  image_url: string | null;
  caption: string | null;
  hashtags: string[];
  final_caption: string | null;
  status: string;
  scheduled_at: string | null;
  buffer_post_id: string | null;
}

interface Registration {
  id: string;
  full_name: string | null;
  email: string | null;
  rsvp_status: string;
  chat_token: string;
  created_at: string;
}

interface EventData {
  event: {
    id: string;
    title: string;
    description: string | null;
    starts_at: string | null;
    venue: string | null;
    status: string;
    breakdown: Array<{ label: string; detail: string }> | null;
    contact_name: string | null;
    contact_email: string | null;
  };
  posts: Post[];
  registrations: Registration[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );

  // Resolve the params promise
  if (!resolvedParams) {
    params.then(setResolvedParams);
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <WorkspaceContent id={resolvedParams.id} />;
}

function WorkspaceContent({ id }: { id: string }) {
  const { data, mutate } = useSWR<EventData>(`/api/events/${id}`, fetcher, {
    refreshInterval: 2000,
  });
  const [generating, setGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedCaption, setSelectedCaption] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [schedulePost, setSchedulePost] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [tab, setTab] = useState<"workspace" | "registrations">("workspace");

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      mutate();
    } finally {
      setGenerating(false);
    }
  }, [id, mutate]);

  const handlePair = useCallback(
    async (postId: string, caption: string) => {
      await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, final_caption: caption }),
      });
      mutate();
    },
    [id, mutate]
  );

  const handleSaveCaption = useCallback(
    async (postId: string) => {
      await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, final_caption: editText }),
      });
      setEditingPost(null);
      mutate();
    },
    [id, editText, mutate]
  );

  const handleSchedule = useCallback(
    async (postId: string) => {
      if (!scheduleDate) return;
      // Try the Buffer schedule endpoint first; fall back to just saving scheduled_at
      // if Buffer isn't configured.
      try {
        const res = await fetch(`/api/schedule`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            postId,
            dueAt: new Date(scheduleDate).toISOString(),
          }),
        });
        if (!res.ok) {
          // If Buffer fails (e.g. not configured), fall back to saving scheduled_at
          await fetch(`/api/events/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              postId,
              scheduled_at: new Date(scheduleDate).toISOString(),
              status: "scheduled",
            }),
          });
        }
      } catch {
        // Fallback: just save the scheduled_at locally
        await fetch(`/api/events/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            postId,
            scheduled_at: new Date(scheduleDate).toISOString(),
            status: "scheduled",
          }),
        });
      }
      setSchedulePost(null);
      setScheduleDate("");
      mutate();
    },
    [id, scheduleDate, mutate]
  );

  if (!data) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const { event, posts, registrations } = data;
  const images = posts.filter((p) => p.image_url);
  const hasPosts = posts.length > 0;
  const allLoaded = posts.length === 3 && posts.every((p) => p.image_url && p.caption);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back
            </a>
            <div className="h-5 w-px bg-zinc-800" />
            <h1 className="text-lg font-semibold tracking-tight">
              {event.title}
            </h1>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                event.status === "draft"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {event.status}
            </span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2 text-sm font-medium hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating
              ? "Generating..."
              : hasPosts
              ? "Regenerate"
              : "✨ Generate Content"}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800/60">
        <div className="mx-auto max-w-7xl px-6 flex gap-0">
          <button
            onClick={() => setTab("workspace")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "workspace"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setTab("registrations")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "registrations"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Registrations ({registrations.length})
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {tab === "workspace" ? (
          <>
            {/* Event Info */}
            {event.breakdown && (event.breakdown as Array<{ label: string; detail: string }>).length > 0 && (
              <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Marketing Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(event.breakdown as Array<{ label: string; detail: string }>).map(
                    (b: { label: string; detail: string }, i: number) => (
                      <div
                        key={i}
                        className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/30"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          {b.label}
                        </span>
                        <p className="text-sm text-zinc-300 mt-1">{b.detail}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* No content state */}
            {!hasPosts && !generating && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🎨</div>
                <h3 className="text-lg font-semibold mb-2">
                  No content generated yet
                </h3>
                <p className="text-zinc-500 mb-6">
                  Click &ldquo;Generate Content&rdquo; to create 3 image + caption variants
                </p>
              </div>
            )}

            {/* Generating skeletons */}
            {generating && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden"
                  >
                    <div className="aspect-square bg-zinc-800 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Variant Grid */}
            {allLoaded && !generating && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                  Select an image & caption pair
                </h3>

                {/* Images row */}
                <div className="mb-6">
                  <p className="text-xs text-zinc-500 mb-2">Images</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {images.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedImage(post.variant_index)}
                        className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                          selectedImage === post.variant_index
                            ? "border-blue-500 ring-2 ring-blue-500/20 scale-[1.02]"
                            : "border-zinc-800 hover:border-zinc-600"
                        }`}
                      >
                        <div className="aspect-square relative bg-zinc-800">
                          {post.image_url && (
                            <Image
                              src={post.image_url}
                              alt={`Variant ${post.variant_index + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          )}
                        </div>
                        <div className="px-3 py-2 bg-zinc-900/80 text-xs text-zinc-400">
                          Variant {post.variant_index + 1}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Captions row */}
                <div className="mb-8">
                  <p className="text-xs text-zinc-500 mb-2">Captions</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() =>
                          setSelectedCaption(post.variant_index)
                        }
                        className={`rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                          selectedCaption === post.variant_index
                            ? "border-violet-500 ring-2 ring-violet-500/20 bg-violet-500/5"
                            : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/30"
                        }`}
                      >
                        <p className="text-sm text-zinc-300 mb-2">
                          {post.caption}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {post.hashtags?.map((h, i) => (
                            <span
                              key={i}
                              className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pair button */}
                {selectedImage !== null && selectedCaption !== null && (
                  <div className="flex justify-center mb-8">
                    <button
                      onClick={() => {
                        const imgPost = posts.find(
                          (p) => p.variant_index === selectedImage
                        );
                        const capPost = posts.find(
                          (p) => p.variant_index === selectedCaption
                        );
                        if (imgPost && capPost?.caption) {
                          handlePair(imgPost.id, capPost.caption);
                        }
                      }}
                      className="rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-medium hover:from-blue-500 hover:to-violet-500 transition-all"
                    >
                      Pair Image {selectedImage + 1} with Caption{" "}
                      {selectedCaption + 1}
                    </button>
                  </div>
                )}

                {/* Paired Posts */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                    Posts
                  </h3>
                  {posts
                    .filter((p) => p.image_url)
                    .map((post) => (
                      <div
                        key={post.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden flex flex-col md:flex-row"
                      >
                        <div className="w-full md:w-48 aspect-square relative shrink-0 bg-zinc-800">
                          {post.image_url && (
                            <Image
                              src={post.image_url}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          )}
                        </div>
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">
                                Variant {post.variant_index + 1}
                              </span>
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  post.status === "scheduled"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : post.final_caption
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-zinc-700/30 text-zinc-500 border border-zinc-700/30"
                                }`}
                              >
                                {post.status === "scheduled"
                                  ? "Scheduled"
                                  : post.final_caption
                                  ? "Paired"
                                  : "Unpaired"}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {post.final_caption && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingPost(post.id);
                                      setEditText(post.final_caption || "");
                                    }}
                                    className="text-xs text-zinc-500 hover:text-blue-400 transition-colors"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSchedulePost(post.id);
                                    }}
                                    className="text-xs text-zinc-500 hover:text-violet-400 transition-colors"
                                  >
                                    📅 Schedule
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {editingPost === post.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveCaption(post.id)}
                                  className="text-xs rounded bg-blue-600 px-3 py-1.5 hover:bg-blue-500 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingPost(null)}
                                  className="text-xs rounded bg-zinc-700 px-3 py-1.5 hover:bg-zinc-600 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-300">
                              {post.final_caption || post.caption || (
                                <span className="text-zinc-600 italic">
                                  No caption paired yet
                                </span>
                              )}
                            </p>
                          )}

                          {schedulePost === post.id && (
                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="datetime-local"
                                value={scheduleDate}
                                onChange={(e) =>
                                  setScheduleDate(e.target.value)
                                }
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                              />
                              <button
                                onClick={() => handleSchedule(post.id)}
                                className="text-xs rounded bg-violet-600 px-3 py-1.5 hover:bg-violet-500 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setSchedulePost(null)}
                                className="text-xs rounded bg-zinc-700 px-3 py-1.5 hover:bg-zinc-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {post.scheduled_at && (
                            <p className="text-xs text-zinc-500 mt-2">
                              📅 Scheduled for{" "}
                              {new Date(post.scheduled_at).toLocaleString()}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
                            {post.hashtags?.map((h, i) => (
                              <span
                                key={i}
                                className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Registrations Tab */
          <div>
            {registrations.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-zinc-500">No registrations yet</p>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        RSVP
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Chat Link
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {registrations.map((reg) => (
                      <tr
                        key={reg.id}
                        className="hover:bg-zinc-900/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-zinc-300">
                          {reg.full_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {reg.email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              reg.rsvp_status === "confirmed"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : reg.rsvp_status === "declined"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {reg.rsvp_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/chat/${reg.chat_token}`;
                              navigator.clipboard.writeText(url);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            📋 Copy Link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
