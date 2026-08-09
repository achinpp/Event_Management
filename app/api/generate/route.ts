import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { supabaseAdmin } from "@/lib/supabase";
import { demoCampaignPlan } from "@/lib/demo";

export const maxDuration = 300;
export const runtime = "nodejs";

// Gemini model for campaign planning (uses existing GOOGLE_GENERATIVE_AI_API_KEY)
const CAMPAIGN_MODEL = "gemini-2.5-flash";

// ── Zod schemas for the full campaign plan ──────────────────────────────

const plannedPostSchema = z.object({
  type: z.string().describe("post phase identifier, e.g. teaser, announcement, early_bird"),
  label: z.string().describe("human-friendly post label"),
  goal: z.string().describe("the marketing objective for this post"),
  publishWindow: z.string().describe("suggested publish timing relative to event date"),
  platform: z.string().describe("recommended platform, e.g. Instagram, LinkedIn, Twitter"),
  caption: z.string().describe("social media caption copy"),
  hashtags: z.array(z.string()).describe("hashtags with # prefix"),
  imageBrief: z.string().describe("brief for the post image creative"),
  callToAction: z.string().describe("specific CTA for this post"),
});

const phaseSchema = z.object({
  name: z.string().describe("phase name, e.g. Pre-Launch, Hype Building"),
  dateRange: z.string().describe("relative date range, e.g. '4-3 weeks before event'"),
  objective: z.string().describe("what this phase aims to achieve"),
  postIndices: z.array(z.number()).describe("indices of posts in postSequence that belong to this phase"),
});

const platformStrategySchema = z.object({
  platform: z.string().describe("platform name, e.g. Instagram, LinkedIn"),
  rationale: z.string().describe("why this platform suits the event"),
  postingFrequency: z.string().describe("recommended posting frequency"),
  contentFocus: z.string().describe("what type of content works best here"),
});

const kpiSchema = z.object({
  metric: z.string().describe("KPI name, e.g. Registration Conversion Rate"),
  target: z.string().describe("target value or range"),
  howToMeasure: z.string().describe("how to track this metric"),
});

const campaignPlanSchema = z.object({
  campaignSummary: z.string().describe("overall campaign strategy summary"),
  targetAudience: z.string().describe("detailed target audience description"),
  campaignGoals: z.array(z.string()).describe("specific measurable campaign goals"),
  keyMessages: z.array(z.string()).describe("core messages to communicate throughout"),
  toneAndVoice: z.string().describe("tone and voice guidelines for all content"),
  platformStrategy: z.array(platformStrategySchema).describe("platform-specific strategies"),
  phases: z.array(phaseSchema).describe("campaign timeline phases"),
  postSequence: z
    .array(plannedPostSchema)
    .describe("5 to 7 ordered campaign posts covering the full event lifecycle"),
  engagementStrategy: z.array(z.string()).describe("engagement tactics and community-building tips"),
  contentCalendar: z.array(
    z.object({
      week: z.string().describe("relative week, e.g. 'Week 1 (4 weeks before)'"),
      activities: z.array(z.string()).describe("content activities planned for this week"),
    })
  ).describe("weekly content calendar"),
  kpiMetrics: z.array(kpiSchema).describe("KPIs to measure campaign success"),
});

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  venue: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

function eventFacts(event: EventRow): string {
  return [
    `Title: ${event.title}`,
    event.starts_at && `Date: ${event.starts_at}`,
    event.venue && `Venue: ${event.venue}`,
    event.description && `Description: ${event.description}`,
    event.contact_name && `Contact Person: ${event.contact_name}`,
    event.contact_email && `Contact Email: ${event.contact_email}`,
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



  // ── AI-powered campaign plan generation ───────────────────────────────

  const prompt = `You are an expert social media campaign strategist for events.
Generate a COMPREHENSIVE social media campaign plan for this event:

${eventFacts(event)}

IMPORTANT RULES:
- Generate between 5 and 7 posts in postSequence, covering the FULL event lifecycle: teaser/save-the-date, announcement, early bird/registration, speaker/agenda highlights, countdown, event day/live coverage, post-event recap/thank you
- Decide the exact number of posts based on the event size, type, and complexity
- All content must be specific to THIS event — use the event title, venue, date, and description in captions
- Each post must have a unique type identifier
- The phases array must reference postSequence indices via postIndices
- Make hashtags specific and relevant to the event
- Make image briefs detailed and visually descriptive
- Analyze the event details carefully and create a tailored campaign`;

  let campaignPlan: z.infer<typeof campaignPlanSchema>;
  try {
    if (process.env.DEMO_MODE === "true") {
      campaignPlan = demoCampaignPlan;
    } else {
      const result = await generateObject({
        model: google(CAMPAIGN_MODEL),
        schema: campaignPlanSchema,
        prompt,
      });
      campaignPlan = result.object;
    }
  } catch (err) {
    console.error("Campaign generation failed:", err);
    return NextResponse.json(
      { error: `Campaign generation failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }

  // ── Persist campaign plan and create post placeholders ────────────────

  // Store the full campaign plan in the event's breakdown column
  await db.from("events").update({ breakdown: campaignPlan }).eq("id", eventId);

  // Delete any existing generated posts for this event (regeneration case)
  await db.from("generated_posts").delete().eq("event_id", eventId);

  // Create post rows for each entry in the AI-generated sequence
  const { error: insertError } = await db.from("generated_posts").insert(
    campaignPlan.postSequence.map((post, i) => ({
      event_id: eventId,
      variant_index: i,
      image_url: null,
      caption: post.caption,
      hashtags: post.hashtags,
      final_caption: null,
      status: "draft",
    }))
  );
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
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
