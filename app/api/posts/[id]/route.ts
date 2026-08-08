import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

// Pairing + inline caption editing. Setting final_caption marks the row as
// the chosen post; null clears it (used when the admin re-pairs).
const patchPost = z.object({
  final_caption: z.string().nullable(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const parsed = patchPost.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "body must be { final_caption: string | null }" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
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
