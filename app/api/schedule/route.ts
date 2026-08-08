import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { createScheduledPost, listChannels } from "@/lib/buffer";

const scheduleBody = z.object({
  postId: z.string().uuid(),
  dueAt: z.string().datetime({ offset: true }),
});

async function resolveChannelId(): Promise<string> {
  const fromEnv = process.env.BUFFER_CHANNEL_ID;
  if (fromEnv) return fromEnv;
  const channels = await listChannels();
  if (channels.length === 0) throw new Error("Buffer account has no channels");
  return channels[0].id;
}

export async function POST(req: Request) {
  const parsed = scheduleBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "body must be { postId: uuid, dueAt: ISO datetime }" },
      { status: 400 }
    );
  }
  const { postId, dueAt } = parsed.data;

  const db = supabaseAdmin();
  const { data: post, error } = await db
    .from("generated_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const caption = post.final_caption ?? post.caption;
  if (!caption) {
    return NextResponse.json(
      { error: "post has no caption yet — pair and edit it first" },
      { status: 400 }
    );
  }
  const hashtags: string[] = post.hashtags ?? [];
  const text = hashtags.length ? `${caption}\n\n${hashtags.join(" ")}` : caption;

  // Buffer's servers fetch the image by URL (/rules #9), so localhost
  // fixture URLs can't be attached — schedule those as text-only.
  const imageUrl =
    post.image_url && !/localhost|127\.0\.0\.1/.test(post.image_url)
      ? post.image_url
      : undefined;

  try {
    const channelId = await resolveChannelId();
    const bufferPost = await createScheduledPost({
      channelId,
      text,
      dueAt,
      imageUrl,
    });
    const { data: updated, error: updateError } = await db
      .from("generated_posts")
      .update({
        scheduled_at: dueAt,
        status: "scheduled",
        buffer_post_id: bufferPost.id,
      })
      .eq("id", postId)
      .select()
      .single();
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ post: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
