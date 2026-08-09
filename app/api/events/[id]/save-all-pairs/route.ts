import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
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

  // Verify ownership of event
  const { data: event, error: eventError } = await db
    .from("events")
    .select("user_id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all generated posts for this event
  const { data: posts, error: postsError } = await db
    .from("generated_posts")
    .select("*")
    .eq("event_id", eventId);

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  // Save all posts that have a caption (and image URL) as saved pairs
  const updates = posts
    .filter((p) => p.caption)
    .map((p) =>
      db
        .from("generated_posts")
        .update({
          final_caption: p.final_caption ?? p.caption,
          status: p.status === "draft" ? "ready" : p.status,
        })
        .eq("id", p.id)
    );

  await Promise.all(updates);

  // Return updated post rows
  const { data: updatedPosts } = await db
    .from("generated_posts")
    .select("*")
    .eq("event_id", eventId)
    .order("variant_index");

  return NextResponse.json({ posts: updatedPosts });
}
