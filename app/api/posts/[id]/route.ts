import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

// Pairing + inline caption editing. Setting final_caption marks the row as
// the chosen post; null clears it (used when the admin re-pairs).
const patchPost = z.object({
  final_caption: z.string().nullable(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const parsed = patchPost.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "body must be { final_caption: string | null }" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Verify ownership of the event linked to the post
  const { data: postCheck, error: postCheckError } = await db
    .from("generated_posts")
    .select("event_id")
    .eq("id", id)
    .maybeSingle();

  if (postCheckError) {
    return NextResponse.json({ error: postCheckError.message }, { status: 500 });
  }
  if (!postCheck) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const { data: event, error: eventError } = await db
    .from("events")
    .select("user_id")
    .eq("id", postCheck.event_id)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!event || event.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: post, error } = await db
    .from("generated_posts")
    .update({ final_caption: parsed.data.final_caption })
    .eq("id", id)
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

