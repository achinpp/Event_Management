import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createScheduledPost, listChannels } from "@/lib/buffer";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await ctx.params;
  const db = supabaseAdmin();

  // Verify event ownership
  const { data: event, error: eventError } = await db
    .from("events")
    .select("id, user_id, title")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    console.error(`[Auto-Schedule] ❌ Event ${eventId} not found`);
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all saved pairs (final_caption IS NOT NULL) that have a scheduled_at
  // but haven't been dispatched to Buffer yet (no buffer_post_id)
  const { data: posts, error: postsError } = await db
    .from("generated_posts")
    .select("*")
    .eq("event_id", eventId)
    .not("final_caption", "is", null)
    .not("scheduled_at", "is", null)
    .order("variant_index");

  if (postsError) {
    console.error(`[Auto-Schedule] ❌ Error fetching posts:`, postsError.message);
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  // Filter out already-scheduled posts
  const pendingPosts = (posts ?? []).filter(
    (p: Record<string, unknown>) => !p.buffer_post_id && p.status !== "scheduled"
  );

  console.log(`[Auto-Schedule] ══════════════════════════════════════`);
  console.log(`[Auto-Schedule] Event: "${event.title}" (${eventId})`);
  console.log(`[Auto-Schedule] Total saved pairs: ${posts?.length ?? 0}`);
  console.log(`[Auto-Schedule] Pending (not yet scheduled): ${pendingPosts.length}`);

  if (pendingPosts.length === 0) {
    console.log(`[Auto-Schedule] Nothing to schedule.`);
    return NextResponse.json({
      message: "No pending posts to schedule",
      scheduled: 0,
      skipped: posts?.length ?? 0,
    });
  }

  // Resolve Buffer channel
  let channelId: string | null = null;
  const hasBufferKey = !!process.env.BUFFER_API_KEY;
  
  if (hasBufferKey) {
    try {
      const fromEnv = process.env.BUFFER_CHANNEL_ID;
      if (fromEnv) {
        channelId = fromEnv;
      } else {
        const channels = await listChannels();
        if (channels.length > 0) {
          channelId = channels[0].id;
        }
      }
      console.log(`[Auto-Schedule] Buffer channel resolved: ${channelId ?? "none"}`);
    } catch (err) {
      console.warn(`[Auto-Schedule] ⚠️ Buffer channel resolution failed:`, err instanceof Error ? err.message : err);
      console.warn(`[Auto-Schedule] Falling back to local-only scheduling (no Buffer dispatch)`);
    }
  } else {
    console.log(`[Auto-Schedule] ℹ️ BUFFER_API_KEY not set — saving scheduled_at locally only`);
  }

  // Process each pending post
  let scheduledCount = 0;
  let failedCount = 0;
  const results: Array<{ postId: string; variant: number; status: string; scheduledAt: string | null }> = [];

  for (let i = 0; i < pendingPosts.length; i++) {
    const post = pendingPosts[i] as Record<string, unknown>;
    const postId = post.id as string;
    const scheduledAt = post.scheduled_at as string;
    const caption = (post.final_caption ?? post.caption) as string;
    const hashtags = (post.hashtags as string[]) ?? [];
    const text = hashtags.length ? `${caption}\n\n${hashtags.join(" ")}` : caption;
    const variant = post.variant_index as number;

    console.log(`[Auto-Schedule] Post #${i + 1}/${pendingPosts.length} (variant ${variant}): ${scheduledAt}`);

    // Try Buffer dispatch if available
    if (channelId && hasBufferKey) {
      const imageUrl =
        (post.image_url as string | null) &&
        !/localhost|127\.0\.0\.1/.test(post.image_url as string) &&
        !(post.image_url as string).startsWith("data:")
          ? (post.image_url as string)
          : undefined;

      try {
        const bufferPost = await createScheduledPost({
          channelId,
          text,
          dueAt: scheduledAt,
          imageUrl,
        });

        await db
          .from("generated_posts")
          .update({
            status: "scheduled",
            buffer_post_id: bufferPost.id,
          })
          .eq("id", postId);

        console.log(`[Auto-Schedule]   ✅ Dispatched to Buffer (buffer_id: ${bufferPost.id})`);
        results.push({ postId, variant, status: "scheduled", scheduledAt });
        scheduledCount++;
      } catch (err) {
        console.error(`[Auto-Schedule]   ❌ Buffer dispatch failed:`, err instanceof Error ? err.message : err);
        
        // Still mark as scheduled locally
        await db
          .from("generated_posts")
          .update({ status: "scheduled" })
          .eq("id", postId);
        
        results.push({ postId, variant, status: "scheduled-local-only", scheduledAt });
        failedCount++;
      }
    } else {
      // No Buffer — just mark as scheduled locally
      await db
        .from("generated_posts")
        .update({ status: "scheduled" })
        .eq("id", postId);

      console.log(`[Auto-Schedule]   ✅ Saved locally (no Buffer dispatch)`);
      results.push({ postId, variant, status: "scheduled-local", scheduledAt });
      scheduledCount++;
    }
  }

  console.log(`[Auto-Schedule] ══════════════════════════════════════`);
  console.log(`[Auto-Schedule] Complete: ${scheduledCount} scheduled, ${failedCount} failed`);
  console.log(`[Auto-Schedule] ══════════════════════════════════════`);

  return NextResponse.json({
    scheduled: scheduledCount,
    failed: failedCount,
    results,
  });
}
