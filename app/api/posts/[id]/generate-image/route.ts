import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { generateImage, fetchLogoInline } from "@/lib/gemini-image";
import { demoImageUrl } from "@/lib/demo";

const imageRequestSchema = z.object({
  imageBrief: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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

  const { data: event, error: eventError } = await db
    .from("events")
    .select("title, venue, description, logo_url")
    .eq("id", post.event_id)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  let logo;
  if (event.logo_url) {
    logo = await fetchLogoInline(event.logo_url).catch(() => undefined);
  }

  const image = await generateImage(
    `Create a square social media image for an event poster.

Event: ${event.title}${event.venue ? `, ${event.venue}` : ""}
Description: ${event.description ?? "No additional description provided."}

Image brief: ${parsed.data.imageBrief}

Style: modern, clean, and easy to read on mobile.`,
    logo
  );

  const path = `${post.event_id}/${id}-${Date.now()}.png`;
  const { error: uploadError } = await db.storage
    .from("posts")
    .upload(path, image.bytes, { contentType: image.mimeType, upsert: true });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const imageUrl = db.storage.from("posts").getPublicUrl(path).data.publicUrl;
  if (!imageUrl) {
    return NextResponse.json(
      { error: "failed to build public image URL" },
      { status: 500 }
    );
  }

  const { error: updateError } = await db
    .from("generated_posts")
    .update({ image_url: imageUrl })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ imageUrl });
}
