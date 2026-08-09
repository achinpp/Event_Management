import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { generatePostDesign } from "@/lib/gemini-agent";
import { demoImageUrl } from "@/lib/demo";
import { getSessionUser } from "@/lib/auth";

const imageRequestSchema = z.object({
  imageBrief: z.string().min(1),
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
  const parsed = imageRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "body must be { imageBrief: string }" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const { data: post, error: postError } = await db
    .from("generated_posts")
    .select("id, event_id, variant_index")
    .eq("id", id)
    .maybeSingle();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const { data: event, error: eventError } = await db
    .from("events")
    .select("user_id, title, venue, description, logo_url")
    .eq("id", post.event_id)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }
  if (event.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (process.env.DEMO_MODE === "true") {
    const imageUrl = demoImageUrl(post.variant_index);
    const { error: updateError } = await db
      .from("generated_posts")
      .update({ image_url: imageUrl })
      .eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ imageUrl });
  }

  try {
    const design = await generatePostDesign({
      postId: id,
      eventId: post.event_id,
      title: event.title,
      venue: event.venue,
      description: event.description,
      logoUrl: event.logo_url,
      imageBrief: parsed.data.imageBrief,
    });

    const { error: updateError } = await db
      .from("generated_posts")
      .update({
        image_url: design.imageUrl,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: design.imageUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate design" },
      { status: 500 }
    );
  }
}
