import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

const captionResultSchema = z.object({
  caption: z.string().describe("Engaging social media caption"),
  hashtags: z.array(z.string()).describe("Relevant hashtags starting with #"),
  callToAction: z.string().describe("Clear action step for readers"),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const db = supabaseAdmin();

  // Fetch post and check existence
  const { data: post, error: postError } = await db
    .from("generated_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (postError || !post) {
    return NextResponse.json({ error: postError?.message ?? "Post not found" }, { status: 404 });
  }

  // Fetch associated event
  const { data: event, error: eventError } = await db
    .from("events")
    .select("*")
    .eq("id", post.event_id)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: eventError?.message ?? "Event not found" }, { status: 404 });
  }

  if (event.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaignPlan = event.breakdown;
  const postSeqItem = campaignPlan?.postSequence?.[post.variant_index];

  const prompt = `You are a social media expert. Regenerate a fresh, high-converting social media caption for this specific post variant:

Event Title: ${event.title}
Venue: ${event.venue ?? "Online / TBA"}
Date: ${event.starts_at ? new Date(event.starts_at).toLocaleString() : "TBA"}
Event Description: ${event.description ?? "N/A"}

Post Variant Label: ${postSeqItem?.label ?? `Post #${post.variant_index + 1}`}
Post Goal: ${postSeqItem?.goal ?? "Drive awareness and RSVPs"}
Recommended Platform: ${postSeqItem?.platform ?? "Social Media"}
Current Caption to replace: ${post.caption ?? "None"}

Generate a new creative caption, hashtags, and Call To Action tailored to this event and post goal.`;

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: captionResultSchema,
      prompt,
    });

    const { caption, hashtags, callToAction } = result.object;

    // Update post row in generated_posts
    const updateData: Record<string, unknown> = {
      caption,
      hashtags,
    };
    if (post.final_caption !== null) {
      updateData.final_caption = caption;
    }

    const { data: updatedPost, error: updateError } = await db
      .from("generated_posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Also update event.breakdown postSequence item if breakdown exists
    if (campaignPlan?.postSequence?.[post.variant_index]) {
      campaignPlan.postSequence[post.variant_index].caption = caption;
      campaignPlan.postSequence[post.variant_index].hashtags = hashtags;
      campaignPlan.postSequence[post.variant_index].callToAction = callToAction;

      await db.from("events").update({ breakdown: campaignPlan }).eq("id", event.id);
    }

    return NextResponse.json({ post: updatedPost });
  } catch (err) {
    console.error("Failed to regenerate caption:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to regenerate caption" },
      { status: 500 }
    );
  }
}
