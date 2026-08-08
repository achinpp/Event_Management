import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Workspace payload: event + variants + registrations in one round trip.
// The workspace polls this every 2s (skeletons during generation, and the
// live registrations table in phase 5).
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const [eventRes, postsRes, registrationsRes] = await Promise.all([
    db.from("events").select("*").eq("id", id).maybeSingle(),
    db
      .from("generated_posts")
      .select("*")
      .eq("event_id", id)
      .order("variant_index"),
    db
      .from("registrations")
      .select("id, full_name, email, rsvp_status, rsvp_at, chat_token, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const error = eventRes.error ?? postsRes.error ?? registrationsRes.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!eventRes.data) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  return NextResponse.json({
    event: eventRes.data,
    posts: postsRes.data,
    registrations: registrationsRes.data,
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = supabaseAdmin();

  // Delete event from DB (cascades automatically to generated_posts, registrations, event_chunks)
  const { error } = await db.from("events").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attempt to clean up storage objects in posts bucket if any exist (best-effort)
  try {
    const { data: files } = await db.storage.from("posts").list(id);
    if (files && files.length > 0) {
      await db.storage
        .from("posts")
        .remove(files.map((f) => `${id}/${f.name}`));
    }
  } catch (storageErr) {
    console.error("Failed to clean up storage for deleted event:", storageErr);
  }

  return NextResponse.json({ success: true });
}

