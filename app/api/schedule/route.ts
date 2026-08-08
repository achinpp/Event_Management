import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

// Phase 3 stub: persist scheduled_at only. Phase 5 wires the Buffer
// createPost call here and flips status to 'scheduled' on success.
const scheduleBody = z.object({
  postId: z.string().uuid(),
  dueAt: z.string().datetime({ offset: true }),
});

export async function POST(req: Request) {
  const parsed = scheduleBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "body must be { postId: uuid, dueAt: ISO datetime }" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const { data: post, error } = await db
    .from("generated_posts")
    .update({ scheduled_at: parsed.data.dueAt })
    .eq("id", parsed.data.postId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
}
