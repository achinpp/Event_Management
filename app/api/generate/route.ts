import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { supabaseAdmin } from "@/lib/supabase";
import { generateImage, fetchLogoInline, InlineImage } from "@/lib/gemini-image";
import { demoBreakdown, demoVariants, demoImageUrl } from "@/lib/demo";

export const maxDuration = 300;
export const runtime = "nodejs";

// Pinned gemini-3-flash 404s — see /decisions-log in CLAUDE.md.
const TEXT_MODEL = "gemini-3-flash-preview";
const VARIANTS = [0, 1, 2] as const;

const briefsSchema = z.object({
  breakdown: z
    .array(z.object({ label: z.string(), detail: z.string() }))
    .describe("key marketing angles extracted from the event"),
  imageBriefs: z
    .array(z.string())
    .length(3)
    .describe("3 distinct visual briefs for square social media images"),
  captionBriefs: z
    .array(z.string())
    .length(3)
    .describe("3 distinct angles for social media captions"),
});

const captionSchema = z.object({
  caption: z.string().describe("social media caption, 1-3 sentences, no hashtags"),
  hashtags: z.array(z.string()).min(3).max(6).describe("hashtags with # prefix"),
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
      status: "draft",
    })),
    { onConflict: "event_id,variant_index" }
  );
  if (placeholderError) {
    return NextResponse.json({ error: placeholderError.message }, { status: 500 });
  }

  if (process.env.DEMO_MODE === "true") {
    // /rules #10 + /verify #8: zero Gemini calls in demo mode.
    await db.from("events").update({ breakdown: demoBreakdown }).eq("id", eventId);
    for (const i of VARIANTS) {
      await db
        .from("generated_posts")
        .update({
          image_url: demoImageUrl(i),
          caption: demoVariants[i].caption,
          hashtags: demoVariants[i].hashtags,
        })
        .eq("event_id", eventId)
        .eq("variant_index", i);
    }
    return finishedPosts(eventId);
  }

  // One structured call → breakdown + 3 image briefs + 3 caption briefs.
  const { object: briefs } = await generateObject({
    model: google(TEXT_MODEL),
    schema: briefsSchema,
    prompt: `You are a social media marketer for events. Break down this event into
its key marketing angles, then write 3 distinct briefs for square promotional
images and 3 distinct briefs for captions. Vary tone and audience across the
three variants (e.g. professional, playful, urgency/FOMO).

${eventFacts(event)}`,
  });

  await db.from("events").update({ breakdown: briefs.breakdown }).eq("id", eventId);

  let logo: InlineImage | undefined;
  if (event.logo_url) {
    logo = await fetchLogoInline(event.logo_url).catch(() => undefined);
  }

  // Fan out: 3 images + 3 captions in parallel.
  const imageTasks = briefs.imageBriefs.map(async (brief, i) => {
    const image = await generateImage(
      `Square social media promotional image for an event.
Brief: ${brief}
Event: ${event.title}${event.venue ? `, ${event.venue}` : ""}
Style: modern, eye-catching, suitable for Instagram. ${
        logo ? "Incorporate the attached logo tastefully." : ""
      }`,
      logo
    );
    const path = `${eventId}/${i}-${Date.now()}.png`;
    const { error } = await db.storage
      .from("posts")
      .upload(path, image.bytes, { contentType: image.mimeType, upsert: true });
    if (error) throw new Error(`storage upload failed: ${error.message}`);
    return db.storage.from("posts").getPublicUrl(path).data.publicUrl;
  });

  const captionTasks = briefs.captionBriefs.map(async (brief) => {
    const { object } = await generateObject({
      model: google(TEXT_MODEL),
      schema: captionSchema,
      prompt: `Write one social media caption for this event.
Brief: ${brief}

${eventFacts(event)}`,
    });
    return object;
  });

  const results = await Promise.all([
    Promise.all(imageTasks),
    Promise.all(captionTasks),
  ]);
  const [imageUrls, captions] = results;

  for (const i of VARIANTS) {
    const { error } = await db
      .from("generated_posts")
      .update({
        image_url: imageUrls[i],
        caption: captions[i].caption,
        hashtags: captions[i].hashtags,
      })
      .eq("event_id", eventId)
      .eq("variant_index", i);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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
