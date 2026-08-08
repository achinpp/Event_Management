import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { scheduleToBuffer } from "@/lib/buffer";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const postId: string | undefined = body?.postId;
  const dueAt: string | undefined = body?.dueAt;

  if (!postId || !dueAt) {
    return NextResponse.json(
      { error: "postId and dueAt are required" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Fetch the post and its public image URL.
  const { data: post, error: postError } = await db
    .from("generated_posts")
    .select("*, events(*)")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const caption = post.final_caption || post.caption || "";
  const hashtags = (post.hashtags || []).join(" ");
  const text = `${caption}\n\n${hashtags}`.trim();

  try {
    const bufferPostId = await scheduleToBuffer({
      text,
      imageUrl: post.image_url,
      dueAt,
    });

    // Update the post status.
    await db
      .from("generated_posts")
      .update({
        status: "scheduled",
        scheduled_at: dueAt,
        buffer_post_id: bufferPostId,
      })
      .eq("id", postId);

    return NextResponse.json({
      success: true,
      bufferPostId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Buffer scheduling failed: ${String(err)}` },
      { status: 502 }
    );
  }
}
