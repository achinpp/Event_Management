"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- generated/remote images, no next/image optimization needed */
import useSWR from "swr";
import { InteractiveEventDatePicker } from "@/components/interactive-event-date-picker";

interface Post {
  id: string;
  variant_index: number;
  image_url: string | null;
  caption: string | null;
  hashtags: string[];
  final_caption: string | null;
  status: string;
  scheduled_at: string | null;
  created_at?: string;
  updated_at?: string;
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

// ── Popular Social Media Platforms Definition ─────────────────────────────

const POPULAR_PLATFORMS = [
  { id: "LinkedIn", name: "LinkedIn", icon: "💼", badge: "Professional", description: "B2B, corporate outreach & professional network" },
  { id: "Twitter", name: "X (Twitter)", icon: "🪶", badge: "News & Hype", description: "Real-time updates, threads & event announcements" },
  { id: "Instagram", name: "Instagram", icon: "📸", badge: "Visual & Reels", description: "High-impact visual posts, Stories & Reels" },
  { id: "Facebook", name: "Facebook", icon: "📘", badge: "Community", description: "Event pages, groups & community engagement" },
  { id: "TikTok", name: "TikTok", icon: "🎵", badge: "Viral Video", description: "Short-form video highlights & trend challenges" },
  { id: "WhatsApp", name: "WhatsApp", icon: "💬", badge: "Direct Chat", description: "Direct chat outreach, broadcasts & group updates" },
  { id: "YouTube", name: "YouTube", icon: "▶️", badge: "Video", description: "Long-form trailers, teasers & live streams" },
  { id: "Threads", name: "Threads", icon: "🧵", badge: "Conversational", description: "Text updates, discussions & audience Q&A" },
];

// ── Main Workspace ──────────────────────────────────────────────────────

export default function Workspace({ eventId }: { eventId: string }) {
  const { data, mutate } = useSWR<EventDetail>(`/api/events/${eventId}`, fetcher, {
    refreshInterval: 2000,
  });
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [busyImageIndex, setBusyImageIndex] = useState<number | null>(null);
  const [busyCaptionIndex, setBusyCaptionIndex] = useState<number | null>(null);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueIndex, setQueueIndex] = useState<number | null>(null);
  const [savingAllPairs, setSavingAllPairs] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [imageGenStatus, setImageGenStatus] = useState<Record<number, string>>({});
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedCaption, setSelectedCaption] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [autoScheduleResult, setAutoScheduleResult] = useState<string | null>(null);
  const [genStepIndex, setGenStepIndex] = useState(0);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "LinkedIn",
    "Twitter",
    "Instagram",
    "Facebook",
  ]);
  const [platformError, setPlatformError] = useState<string | null>(null);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
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

  if (!data) {
    return <main className="p-10 text-sm opacity-70">Loading…</main>;
  }
  if (!data.event) {
    return <main className="p-10 text-sm text-red-500">Event not found.</main>;
  }

  const { event, posts } = data;
  const campaignPlan = event.breakdown;
  const savedPairs = posts.filter((p) => p.final_caption !== null);

  async function runImageQueue(targetPosts?: Post[], planOverride?: CampaignPlan) {
    const listToProcess = targetPosts ?? posts;
    const plan = planOverride ?? campaignPlan;
    console.log(`[🎨 Image Queue] Starting queue with ${listToProcess.length} posts`);
    console.log(`[🎨 Image Queue] postSequence available: ${!!plan?.postSequence} (${plan?.postSequence?.length ?? 0} items)`);
    if (!plan?.postSequence || listToProcess.length === 0) {
      console.warn(`[🎨 Image Queue] Aborted: no postSequence or empty list`);
      return;
    }
    setIsQueueRunning(true);
    setError(null);
    setImageGenStatus({});
    const startTime = Date.now();
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (let i = 0; i < listToProcess.length; i++) {
      const p = listToProcess[i];
      if (p.image_url) {
        console.log(`[🎨 Image Queue] Post #${i + 1} (${p.id}) — already has image, skipping`);
        skipCount++;
        setImageGenStatus(prev => ({ ...prev, [i]: "skipped" }));
        continue;
      }

      setQueueIndex(i);
      setImageGenStatus(prev => ({ ...prev, [i]: "generating" }));
      const imageBrief = plan.postSequence[i]?.imageBrief ?? "Event poster design";
      console.log(`[🎨 Image Queue] Post #${i + 1} (${p.id}) — sending request...`);
      console.log(`[🎨 Image Queue]   imageBrief: "${imageBrief.substring(0, 80)}..."`);

      const itemStart = Date.now();
      try {
        const res = await fetch(`/api/posts/${p.id}/generate-image`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ imageBrief }),
        });
        const elapsed = ((Date.now() - itemStart) / 1000).toFixed(1);

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          console.error(`[🎨 Image Queue] ❌ Post #${i + 1} FAILED (${res.status}) after ${elapsed}s:`, payload?.error);
          setImageGenStatus(prev => ({ ...prev, [i]: `failed: ${payload?.error ?? res.status}` }));
          failCount++;
        } else {
          const payload = await res.json().catch(() => null);
          const isDataUri = payload?.imageUrl?.startsWith("data:");
          console.log(`[🎨 Image Queue] ✅ Post #${i + 1} OK in ${elapsed}s — ${isDataUri ? "Data URI (storage fallback)" : "Storage URL"}`);
          setImageGenStatus(prev => ({ ...prev, [i]: isDataUri ? "done (data-uri)" : "done" }));
          successCount++;
        }
      } catch (err) {
        const elapsed = ((Date.now() - itemStart) / 1000).toFixed(1);
        console.error(`[🎨 Image Queue] ❌ Post #${i + 1} NETWORK ERROR after ${elapsed}s:`, err);
        setImageGenStatus(prev => ({ ...prev, [i]: `network-error` }));
        failCount++;
      }
      // Refresh data + force image cache-bust so the new image renders immediately
      setRefreshKey(Date.now());
      await mutate();
      // Small delay to let the UI render the new image before starting the next one
      await new Promise(r => setTimeout(r, 500));
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[🎨 Image Queue] ══════════════════════════════════════`);
    console.log(`[🎨 Image Queue] Queue complete in ${totalElapsed}s`);
    console.log(`[🎨 Image Queue]   ✅ Success: ${successCount}  ⏭️ Skipped: ${skipCount}  ❌ Failed: ${failCount}`);
    console.log(`[🎨 Image Queue] ══════════════════════════════════════`);
    setQueueIndex(null);
    setIsQueueRunning(false);
  }

  const activePlan = campaignPlan;

  const GEN_STEPS = [
    { label: "Analyzing Event Details & Knowledge Base", icon: "🔍" },
    { label: "Synthesizing AI Social Strategy & Audience Messaging", icon: "🤖" },
    { label: "Drafting Multi-Phase Post Schedule & Captions", icon: "📝" },
    { label: "Preparing AI Poster Graphic Generation Pipeline", icon: "🎨" },
  ];

  function togglePlatform(platformId: string) {
    setPlatformError(null);
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  }

  function handleSelectAllPlatforms() {
    setPlatformError(null);
    setSelectedPlatforms(POPULAR_PLATFORMS.map((p) => p.id));
  }

  function handleClearAllPlatforms() {
    setPlatformError(null);
    setSelectedPlatforms([]);
  }

  function handleLaunchCampaignWithValidation() {
    if (selectedPlatforms.length === 0) {
      setPlatformError("Please select at least 1 social media platform before generating your campaign.");
      return;
    }
    setShowPlatformModal(false);
    generate(selectedPlatforms);
  }

  async function generate(overridePlatforms?: string[]) {
    const platformsToUse = overridePlatforms ?? selectedPlatforms;
    if (!platformsToUse || platformsToUse.length === 0) {
      setPlatformError("Please select at least one social media platform before generating your campaign.");
      setShowPlatformModal(true);
      return;
    }

    setGenerating(true);
    setError(null);
    setGenStepIndex(0);
    console.log(`[🚀 Generate] Starting campaign generation for event ${eventId} targeting: ${platformsToUse.join(", ")}`);
    
    // Cycle step indicator while generating
    const stepInterval = setInterval(() => {
      setGenStepIndex((prev) => (prev + 1) % GEN_STEPS.length);
    }, 2800);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, targetPlatforms: platformsToUse }),
      });
      clearInterval(stepInterval);
      setGenerating(false);

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        console.error(`[🚀 Generate] ❌ Campaign generation failed (${res.status}):`, json?.error);
        setError(json?.error ?? `generate failed (${res.status})`);
        return;
      }
      const json = await res.json();
      console.log(`[🚀 Generate] ✅ Campaign generated, ${json?.posts?.length ?? 0} posts created`);
      
      // Fetch fresh SWR data so we get the updated campaignPlan with postSequence
      const freshData = await mutate();
      console.log(`[🚀 Generate] SWR refreshed, postSequence available: ${!!freshData?.event?.breakdown?.postSequence}`);
      
      // Auto-trigger image generation queue for all posts, passing the fresh plan
      if (json?.posts && Array.isArray(json.posts)) {
        const freshPlan = freshData?.event?.breakdown as CampaignPlan | undefined;
        console.log(`[🚀 Generate] Starting image queue with freshPlan (${freshPlan?.postSequence?.length ?? 0} items)`);
        runImageQueue(json.posts, freshPlan);
      }
    } catch (err) {
      clearInterval(stepInterval);
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Campaign generation encountered a network error");
    }
  }

  async function savePair() {
    if (selectedImage === null || selectedCaption === null) return;
    const imageRow = posts.find((p) => p.variant_index === selectedImage);
    const captionRow = posts.find((p) => p.variant_index === selectedCaption);
    if (!imageRow || !captionRow?.caption) return;
    setError(null);
    
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

  async function saveSinglePair(postIndex: number) {
    const post = posts[postIndex];
    if (!post || !post.caption) return;
    setError(null);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ final_caption: post.caption }),
    });
    if (!res.ok) setError("saving pair failed");
    mutate();
  }

  async function saveAllRelatedPairs() {
    setSavingAllPairs(true);
    setError(null);
    const res = await fetch(`/api/events/${eventId}/save-all-pairs`, {
      method: "POST",
    });
    setSavingAllPairs(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Failed to save all pairs");
    } else {
      mutate();
    }
  }

  async function generateImageForPost(postIndex: number) {
    console.log(`[🎨 Single Image] Generating for post index #${postIndex}`);
    if (!campaignPlan?.postSequence?.[postIndex]) {
      console.warn(`[🎨 Single Image] No postSequence at index ${postIndex}`);
      return;
    }
    const post = posts[postIndex];
    if (!post) {
      console.warn(`[🎨 Single Image] No DB post at index ${postIndex}`);
      return;
    }
    setBusyImageIndex(postIndex);
    setImageGenStatus(prev => ({ ...prev, [postIndex]: "generating" }));
    setError(null);

    const imageBrief = campaignPlan.postSequence[postIndex].imageBrief;
    console.log(`[🎨 Single Image] Post ID: ${post.id}`);
    console.log(`[🎨 Single Image] Brief: "${imageBrief.substring(0, 100)}..."`);

    const itemStart = Date.now();
    try {
      const res = await fetch(`/api/posts/${post.id}/generate-image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBrief }),
      });
      const elapsed = ((Date.now() - itemStart) / 1000).toFixed(1);

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        console.error(`[🎨 Single Image] ❌ FAILED (${res.status}) after ${elapsed}s:`, payload?.error);
        setError(payload?.error ?? "Image generation failed");
        setImageGenStatus(prev => ({ ...prev, [postIndex]: `failed: ${payload?.error ?? res.status}` }));
      } else {
        const payload = await res.json().catch(() => null);
        const isDataUri = payload?.imageUrl?.startsWith("data:");
        console.log(`[🎨 Single Image] ✅ OK in ${elapsed}s — ${isDataUri ? "Data URI (storage fallback)" : "Storage URL"}`);
        setImageGenStatus(prev => ({ ...prev, [postIndex]: isDataUri ? "done (data-uri)" : "done" }));
      }
    } catch (err) {
      const elapsed = ((Date.now() - itemStart) / 1000).toFixed(1);
      console.error(`[🎨 Single Image] ❌ NETWORK ERROR after ${elapsed}s:`, err);
      setError("Network error during image generation");
      setImageGenStatus(prev => ({ ...prev, [postIndex]: "network-error" }));
    }

    setBusyImageIndex(null);
    setRefreshKey(Date.now());
    await mutate();
  }

  async function regenerateCaptionForPost(postIndex: number) {
    const post = posts[postIndex];
    if (!post) return;
    setBusyCaptionIndex(postIndex);
    setError(null);

    const res = await fetch(`/api/posts/${post.id}/regenerate-caption`, {
      method: "POST",
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.error ?? "Caption regeneration failed");
    }

    setBusyCaptionIndex(null);
    setRefreshKey(Date.now());
    await mutate();
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
      logo_url: logoUrl !== null ? logoUrl : event.logo_url,
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

        {/* Breadcrumb Back Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all hover:bg-zinc-200/60 hover:text-zinc-900 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Events Dashboard</span>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[240px]">{event.title}</span>
        </div>

        {/* Edit Event Details Modal */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800 pb-3 mb-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Edit Event Details</h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="grid gap-4">
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Event Title</label>
                  <input
                    name="title"
                    defaultValue={event.title}
                    required
                    className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                  />
                </div>

                {/* Logo Image Upload with Validation */}
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Event Logo (PNG, JPEG, WEBP, SVG)
                  </label>
                  <div className="flex items-center gap-3">
                    {logoUrl || event.logo_url ? (
                      <div className="relative group">
                        <img
                          src={logoUrl ?? event.logo_url ?? ""}
                          alt="Logo Preview"
                          className="h-12 w-12 rounded-xl object-cover border border-indigo-500/40 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</label>
                  <textarea
                    name="description"
                    defaultValue={event.description ?? ""}
                    rows={4}
                    className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Starts At</label>
                    <InteractiveEventDatePicker
                      name="starts_at"
                      defaultValue={event.starts_at ? new Date(event.starts_at).toISOString() : undefined}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Venue</label>
                    <input
                      name="venue"
                      defaultValue={event.venue ?? ""}
                      className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact Name</label>
                    <input
                      name="contact_name"
                      defaultValue={event.contact_name ?? ""}
                      className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact Email</label>
                    <input
                      name="contact_email"
                      type="email"
                      defaultValue={event.contact_email ?? ""}
                      className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact Phone</label>
                    <input
                      name="contact_phone"
                      defaultValue={event.contact_phone ?? ""}
                      className="rounded-xl border border-zinc-200/80 bg-white/50 px-3.5 py-2 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200/60 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {saving ? "Saving Changes…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modern Redesigned Event Detail Header Hero Card */}
        <div className="relative mt-6 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/80 p-6 sm:p-7 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:shadow-2xl">
          {/* Top Decorative Gradient Line Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          {/* Subtle Ambient Radial Glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/15" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Column: Event Logo + Details */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0 flex-1">
              {/* Event Logo Badge */}
              <div className="relative shrink-0 group">
                {event.logo_url ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-indigo-500/20 bg-white shadow-md transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-500/40 dark:border-indigo-400/20 dark:bg-zinc-900">
                    <img
                      src={event.logo_url}
                      alt={`${event.title} Logo`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white font-black text-xl shadow-lg ring-2 ring-indigo-500/20 transition-all duration-300 group-hover:scale-105">
                    {event.title ? event.title.substring(0, 2).toUpperCase() : "EV"}
                  </div>
                )}
              </div>

              {/* Event Information Block */}
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                    {event.title}
                  </h1>
                  
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-xs ${
                      event.status === "active" || event.status === "published"
                        ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : event.status === "draft"
                        ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
                        : "bg-zinc-500/10 text-zinc-600 ring-1 ring-zinc-500/30 dark:bg-zinc-500/15 dark:text-zinc-400"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        event.status === "active" || event.status === "published"
                          ? "bg-emerald-500 animate-pulse"
                          : event.status === "draft"
                          ? "bg-amber-500"
                          : "bg-zinc-400"
                      }`}
                    />
                    {event.status}
                  </span>
                </div>

                {event.description && (
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-4xl leading-relaxed mt-1 mb-3">
                    {event.description}
                  </p>
                )}

                {/* Metadata Pills Container */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  {event.venue && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-100/80 px-3 py-1.5 text-zinc-700 backdrop-blur-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-300">
                      <svg className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{event.venue}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-100/80 px-3 py-1.5 text-zinc-700 backdrop-blur-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-300">
                    <svg className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {event.starts_at ? new Date(event.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "No Date Scheduled"}
                    </span>
                  </div>

                  {(event.contact_name || event.contact_email) && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-100/80 px-3 py-1.5 text-zinc-700 backdrop-blur-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-300">
                      <svg className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {event.contact_name ?? "Organizer"} {event.contact_email ? `(${event.contact_email})` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Actions Block */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t border-zinc-200/60 lg:border-t-0 dark:border-zinc-800/80">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white/90 px-4 text-xs font-bold text-zinc-700 shadow-xs transition-all hover:bg-zinc-100 hover:border-zinc-300 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:border-zinc-700 cursor-pointer"
              >
                <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span>Edit Details</span>
              </button>

              <Link
                href={`/admin/events/${eventId}/registrations`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white/90 px-4 text-xs font-bold text-zinc-700 shadow-xs transition-all hover:bg-zinc-100 hover:border-zinc-300 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:border-zinc-700 cursor-pointer"
              >
                <svg className="h-4 w-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span>Registrations</span>
                <span className="ml-0.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-black text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {data.registrations.length}
                </span>
              </Link>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 text-xs font-bold text-red-600 transition-all hover:bg-red-500/15 hover:border-red-500/30 active:scale-95 disabled:opacity-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer"
              >
                <svg className="h-4 w-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span>{deleting ? "Deleting…" : "Delete"}</span>
              </button>

              <button
                onClick={() => setShowPlatformModal(true)}
                disabled={generating}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 px-5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 hover:from-indigo-500 hover:to-violet-500 active:scale-98 disabled:opacity-50 cursor-pointer dark:shadow-indigo-900/40"
              >
                {generating ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    <span>Campaign Generating...</span>
                  </>
                ) : posts.length > 0 ? (
                  <>
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Regenerate Campaign</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                    <span>Generate Campaign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-550/5 p-4 text-xs font-semibold text-red-500 dark:border-red-500/10">{error}</p>}

        {/* Interactive Campaign Generation Visual Feedback Banner */}
        {generating && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-purple-950/40 p-6 shadow-2xl backdrop-blur-xl animate-fadeIn">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {/* Animated Radar Pulse Spinner */}
                <div className="relative flex h-14 w-14 items-center justify-center shrink-0">
                  <div className="absolute h-full w-full rounded-full bg-indigo-500/30 animate-ping" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg text-xl">
                    ⚡
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                      AI Orchestrator Processing
                    </span>
                    <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Your campaign is still generating...
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Please hold on! Gemini AI is synthesizing multi-day strategy, captions, and graphic prompts.
                  </p>
                </div>
              </div>
              
              {/* Animated Progress Steps */}
              <div className="w-full md:w-auto min-w-[300px] rounded-xl border border-indigo-500/20 bg-indigo-900/30 p-4 backdrop-blur-md">
                <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-200">
                  <span className="text-base">{GEN_STEPS[genStepIndex].icon}</span>
                  <span className="truncate">{GEN_STEPS[genStepIndex].label}</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 transition-all duration-500"
                    style={{ width: `${((genStepIndex + 1) / GEN_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

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
              Select your target social media platforms to outline targeted post schedules, captions, and AI graphic prompts.
            </p>
            <button
              onClick={() => setShowPlatformModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-[1.02] cursor-pointer"
            >
              📱 Select Platforms & Launch Campaign Generator
            </button>
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
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
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
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
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
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
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
                      <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{ps.platform}</h4>
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
                        <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{phase.name}</h4>
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
                {/* Header Actions & Auto-Queue Bar */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Campaign Post Pairs & Assets
                    </h4>
                    <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">
                      Generate missing graphics automatically, regenerate individual items, and save all post pairs.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => runImageQueue()}
                      disabled={isQueueRunning}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-500 disabled:opacity-50"
                    >
                      {isQueueRunning ? `⏳ Generating Queue #${(queueIndex ?? 0) + 1}…` : "⚡ Auto-Generate All Graphics"}
                    </button>

                    <button
                      onClick={saveAllRelatedPairs}
                      disabled={savingAllPairs}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-650 px-4 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.01] disabled:opacity-50"
                    >
                      {savingAllPairs ? "Saving Pairs…" : "✨ Save All Related Pairs"}
                    </button>
                  </div>
                </div>

                {/* Queue Progress Bar */}
                {isQueueRunning && (
                  <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1.5">
                      <span>Synthesizing campaign images in background queue...</span>
                      <span>{queueIndex !== null ? `Post #${queueIndex + 1} of ${campaignPlan.postSequence.length}` : "Processing..."}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-500/20">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300"
                        style={{
                          width: `${(((queueIndex ?? 0) + 1) / campaignPlan.postSequence.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {campaignPlan.postSequence.map((post, index) => {
                    const dbPost = posts.find((p) => p.variant_index === index) || posts[index];
                    const imageUrl = dbPost?.image_url
                      ? `${dbPost.image_url}?v=${refreshKey}`
                      : null;
                    const isBusyImage = busyImageIndex === index;
                    const isBusyCaption = busyCaptionIndex === index;
                    const isQueueActiveThis = isQueueRunning && queueIndex === index;
                    const isSavedPair = dbPost?.final_caption !== null && dbPost?.final_caption !== undefined;

                    return (
                      <div
                        key={post.type || index}
                        className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                          isSavedPair
                            ? "border-green-500/30 bg-green-500/[0.02] dark:border-green-500/20"
                            : "border-zinc-200 bg-white/40 dark:border-zinc-800 dark:bg-zinc-950/20"
                        }`}
                      >
                        <div>
                          {/* Top Tag Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2.5 mb-3">
                            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{post.label}</span>
                            <div className="flex items-center gap-1.5">
                              {isSavedPair && (
                                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                                  ✓ Saved Pair
                                </span>
                              )}
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                {post.publishWindow}
                              </span>
                            </div>
                          </div>

                          {/* Image Box */}
                          <div className="relative mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={post.label}
                                className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
                                onError={(e) => {
                                  // Fallback display if fetch fails
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : isQueueActiveThis || isBusyImage ? (
                              <div className="relative flex aspect-square w-full flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40">
                                {/* Animated spinner ring */}
                                <div className="relative mb-4">
                                  <div className="h-16 w-16 rounded-full border-4 border-indigo-200 dark:border-indigo-800" />
                                  <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
                                  <span className="absolute inset-0 flex items-center justify-center text-2xl">🎨</span>
                                </div>
                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 animate-pulse">
                                  Generating with Gemini AI…
                                </span>
                                <span className="mt-1.5 text-[11px] text-indigo-500/80 dark:text-indigo-400/70">
                                  This may take 15-30 seconds
                                </span>
                                {/* Status badge */}
                                {imageGenStatus[index] && (
                                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-600/10 px-3 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    {imageGenStatus[index]}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex aspect-square w-full flex-col items-center justify-center p-4 text-center">
                                <span className="text-3xl mb-2 opacity-40">🖼️</span>
                                <span className="text-xs font-semibold opacity-50">No graphic generated yet</span>
                                {imageGenStatus[index] && imageGenStatus[index] !== "skipped" && (
                                  <span className={`mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    imageGenStatus[index]?.startsWith("failed") || imageGenStatus[index] === "network-error"
                                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                      : imageGenStatus[index]?.startsWith("done")
                                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                  }`}>
                                    {imageGenStatus[index]}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Platform & Goal</span>
                          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">{post.platform} · {post.goal}</p>

                          <div className="mt-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Caption Copy</span>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                              {dbPost?.caption ?? post.caption}
                            </p>
                          </div>

                          {(dbPost?.hashtags?.length || post.hashtags?.length) && (
                            <p className="mt-2 text-xs text-indigo-500 dark:text-indigo-400">
                              {(dbPost?.hashtags ?? post.hashtags).join(" ")}
                            </p>
                          )}

                          {post.callToAction && (
                            <p className="mt-2.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                              CTA: {post.callToAction}
                            </p>
                          )}

                          <div className="mt-3.5 border-t border-zinc-200/40 dark:border-zinc-800/40 pt-2.5 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Creative Brief</span>
                            <p className="mt-1 text-zinc-500 dark:text-zinc-400 leading-normal text-[11px]">{post.imageBrief}</p>
                          </div>
                        </div>

                        {/* Action Buttons for this card */}
                        <div className="mt-5 flex flex-col gap-2 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/40">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => generateImageForPost(index)}
                              disabled={busyImageIndex !== null || isQueueRunning}
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            >
                              {isBusyImage ? "⏳ Graphics…" : "🎨 Regenerate Image"}
                            </button>

                            <button
                              onClick={() => regenerateCaptionForPost(index)}
                              disabled={busyCaptionIndex !== null}
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            >
                              {isBusyCaption ? "⏳ Text…" : "✍️ Regenerate Caption"}
                            </button>
                          </div>

                          <button
                            onClick={() => saveSinglePair(index)}
                            className={`w-full rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all ${
                              isSavedPair
                                ? "border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-500/20"
                                : "bg-indigo-600 text-white hover:bg-indigo-500"
                            }`}
                          >
                            {isSavedPair ? "✓ Pair Saved to Campaign" : "💾 Save This Pair"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
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
                Match generated graphics with corresponding captions to compile chosen pairs, then schedule dispatch times.
              </p>
            </div>

            {/* Grid selectors */}
            <div className="grid gap-8 lg:grid-cols-12">
              
              {/* Asset list (col-span-5) */}
              <section className="lg:col-span-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  1 · Choose Visual Asset
                </h3>
                
                <div className="grid gap-3 grid-cols-2">
                  {posts.map((post) => {
                    const imgUrl = post.image_url ? `${post.image_url}?v=${refreshKey}` : null;
                    return (
                      <button
                        key={post.id}
                        onClick={() => setSelectedImage(post.variant_index)}
                        disabled={!post.image_url}
                        className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-all ${
                          selectedImage === post.variant_index
                            ? "border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.25)] scale-[1.01]"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700"
                        }`}
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
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
                    );
                  })}
                </div>
              </section>

              {/* Caption list (col-span-7) */}
              <section className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
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
                            : "border-zinc-200 bg-white/30 dark:border-zinc-800 dark:bg-zinc-900/10 hover:border-zinc-400 dark:hover:border-zinc-700"
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
                    Save As Selected Pair
                  </button>
                </div>
              </section>

            </div>

            {/* 3. Saved Campaign Pairs Scheduling List */}
            {savedPairs.length > 0 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
                      3 · Dispatch Scheduler ({savedPairs.length} Saved Pairs)
                    </h3>
                    <span className="text-xs text-zinc-400">
                      Schedule publish dates for all saved campaign pairs
                    </span>
                  </div>

                  <button
                    onClick={async () => {
                      setAutoScheduling(true);
                      setAutoScheduleResult(null);
                      console.log(`[⚡ Auto-Schedule] Starting bulk auto-schedule for event ${eventId}`);
                      try {
                        const res = await fetch(`/api/events/${eventId}/auto-schedule`, {
                          method: "POST",
                        });
                        const json = await res.json().catch(() => null);
                        if (res.ok) {
                          console.log(`[⚡ Auto-Schedule] ✅ Done:`, json);
                          setAutoScheduleResult(`✅ ${json.scheduled} posts scheduled${json.failed ? `, ${json.failed} failed` : ""}`);
                        } else {
                          console.error(`[⚡ Auto-Schedule] ❌ Failed:`, json?.error);
                          setAutoScheduleResult(`❌ ${json?.error ?? "Failed"}`);
                        }
                      } catch (err) {
                        console.error(`[⚡ Auto-Schedule] ❌ Network error:`, err);
                        setAutoScheduleResult("❌ Network error");
                      }
                      setAutoScheduling(false);
                      mutate();
                    }}
                    disabled={autoScheduling}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.01] hover:shadow-amber-500/20 disabled:opacity-50"
                  >
                    {autoScheduling ? "⏳ Scheduling All…" : "⚡ Auto-Schedule All Posts"}
                  </button>
                </div>

                {autoScheduleResult && (
                  <div className={`rounded-xl border p-3 text-xs font-semibold ${
                    autoScheduleResult.startsWith("✅")
                      ? "border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400"
                      : "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
                  }`}>
                    {autoScheduleResult}
                  </div>
                )}

                <div className="space-y-6">
                  {savedPairs.map((pair) => (
                    <ChosenPost
                      key={`${pair.id}:${pair.final_caption}:${pair.updated_at || ""}`}
                      post={pair}
                      onSaved={() => mutate()}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}



        {/* Social Media Platforms Selector Modal */}
        {showPlatformModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
              {/* Top Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <div className="flex items-start justify-between border-b border-zinc-200/60 pb-4 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                      Select Target Social Media Platforms
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Choose which channels you want to target for this event campaign. AI will tailor post sequence, frequency, format, and captions specifically for your selected platforms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlatformModal(false)}
                  className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Quick Action Bar & Counter */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-100/70 p-3 backdrop-blur-xs dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Selected Platforms:
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${
                    selectedPlatforms.length > 0
                      ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                      : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                  }`}>
                    {selectedPlatforms.length} of {POPULAR_PLATFORMS.length} Selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllPlatforms}
                    className="rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllPlatforms}
                    className="rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Validation Error Message */}
              {platformError && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{platformError}</span>
                </div>
              )}

              {/* Platforms Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {POPULAR_PLATFORMS.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <div
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition-all duration-200 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 shadow-xs dark:bg-indigo-500/15 dark:border-indigo-500/60"
                          : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700 mt-0.5 transition-colors">
                        {isSelected && (
                          <span className="h-3.5 w-3.5 rounded-xs bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{platform.icon}</span>
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {platform.name}
                          </span>
                          <span className="ml-auto rounded-full bg-zinc-200/60 px-2 py-0.5 text-[9px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {platform.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                          {platform.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-200/60 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPlatformModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLaunchCampaignWithValidation}
                  disabled={selectedPlatforms.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>🚀 Launch AI Campaign Generation</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black text-white">
                    {selectedPlatforms.length} Channels
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


// ── Chosen Post (scheduling card - Twitter/LinkedIn Mockup) ─────────────

function ChosenPost({ post, onSaved }: { post: Post; onSaved: () => void }) {
  const [draft, setDraft] = useState(post.final_caption ?? "");
  // Pre-fill dueAt from auto-calculated scheduled_at
  const [dueAt, setDueAt] = useState(() => {
    if (!post.scheduled_at) return "";
    const d = new Date(post.scheduled_at);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  });
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
      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-4">
        3 · Schedule Dispatch
      </h3>
      
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Mock Post Composer image */}
        {post.image_url && (
          <div className="w-full lg:w-48 shrink-0 flex flex-col gap-2">
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-100">
              <img
                src={post.image_url}
                alt="Chosen"
                className="h-48 w-48 w-full object-cover"
              />
            </div>

          </div>
        )}
        
        {/* Mock Composer Panel */}
        <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60 shadow-sm flex flex-col justify-between">
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
              {post.scheduled_at && (
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                  💡 Auto-suggested: {new Date(post.scheduled_at).toLocaleString()}
                </span>
              )}
            </div>
            
            <button
              onClick={schedule}
              disabled={!dueAt || busy !== null}
              className="mt-4 rounded-lg bg-gradient-to-r from-violet-650 to-indigo-650 px-4 py-2 text-xs font-bold text-white hover:scale-[1.01] disabled:opacity-40"
            >
              {busy === "schedule" ? "Scheduling…" : "Schedule with Buffer"}
            </button>
            
            {post.scheduled_at && post.status === "scheduled" && (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400">
                <span>✓</span> Scheduled: {new Date(post.scheduled_at).toLocaleString()}
              </span>
            )}
            {post.scheduled_at && post.status !== "scheduled" && (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <span>⏰</span> Suggested: {new Date(post.scheduled_at).toLocaleString()}
              </span>
            )}
            
            {notice && <span className="mt-4 text-xs font-medium opacity-70">{notice}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
