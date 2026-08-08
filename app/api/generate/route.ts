import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { supabaseAdmin } from "@/lib/supabase";
import { demoCampaignPlan, demoImageUrl } from "@/lib/demo";

export const maxDuration = 300;
export const runtime = "nodejs";

// Using gemini-3.1-flash-lite for the campaign orchestrator
const TEXT_MODEL = "gemini-3.1-flash-lite";
const VARIANTS = [0, 1, 2] as const;

const plannedPostSchema = z.object({
  type: z.string().describe("post phase identifier, e.g. coming_soon"),
  label: z.string().describe("human-friendly post label"),
  goal: z.string().describe("the marketing objective for this post"),
  publishWindow: z.string().describe("suggested publish timing"),
  caption: z.string().describe("social media caption copy"),
  hashtags: z.array(z.string()).min(1).max(10).describe("hashtags with # prefix"),
  imageBrief: z.string().describe("brief for the post image creative"),
});

const campaignPlanSchema = z.object({
  campaignSummary: z.string().describe("overall campaign strategy summary"),
  postSequence: z
    .array(plannedPostSchema)
    .length(3)
    .describe("three ordered planned campaign posts"),
});

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  venue: string | null;
  logo_url: string | null;
}

function eventFacts(event: EventRow): string {
  return [
    `Title: ${event.title}`,
    event.starts_at && `Date: ${event.starts_at}`,
    event.venue && `Venue: ${event.venue}`,
    event.description && `Description: ${event.description}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const eventId: string | undefined = body?.eventId;
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: event, error: eventError } = await db
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single<EventRow>();
  if (eventError || !event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  // Placeholder rows first: the workspace UI polls and shows skeletons.
  const { error: placeholderError } = await db.from("generated_posts").upsert(
    VARIANTS.map((i) => ({
      event_id: eventId,
      variant_index: i,
      image_url: null,
      caption: null,
      hashtags: [],
      final_caption: null,
      status: "draft",
    })),
    { onConflict: "event_id,variant_index" }
  );
  if (placeholderError) {
    return NextResponse.json({ error: placeholderError.message }, { status: 500 });
  }

  if (process.env.DEMO_MODE === "true") {
    // /rules #10 + /verify #8: zero Gemini calls in demo mode.
    await db.from("events").update({ breakdown: demoCampaignPlan }).eq("id", eventId);
    for (const i of VARIANTS) {
      await db
        .from("generated_posts")
        .upsert(
          {
            event_id: eventId,
            variant_index: i,
            image_url: demoImageUrl(i),
            caption: demoCampaignPlan.postSequence[i].caption,
            hashtags: demoCampaignPlan.postSequence[i].hashtags,
            final_caption: null,
            status: "draft",
          },
          { onConflict: "event_id,variant_index" }
        );
    }
    return finishedPosts(eventId);
  }

  const { object: campaignPlan } = await generateObject({
    model: google(TEXT_MODEL),
    schema: campaignPlanSchema,
    prompt: `You are a social media campaign designer for events. Read the event details below and create a short campaign with three social media posts. For each post, choose a phase, a clear goal, a suggested publish timing, caption copy, hashtags, and an image creative brief.

${eventFacts(event)}`,
  });

  await db.from("events").update({ breakdown: campaignPlan }).eq("id", eventId);

  const { error: upsertError } = await db.from("generated_posts").upsert(
    campaignPlan.postSequence.map((post, i) => ({
      event_id: eventId,
      variant_index: i,
      image_url: null,
      caption: post.caption,
      hashtags: post.hashtags,
      final_caption: null,
      status: "draft",
    })),
    { onConflict: "event_id,variant_index" }
  );
  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return finishedPosts(eventId);
}

async function finishedPosts(eventId: string) {
  const db = supabaseAdmin();
  const { data: posts, error } = await db
    .from("generated_posts")
    .select("*")
    .eq("event_id", eventId)
    .order("variant_index");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ posts });
}
