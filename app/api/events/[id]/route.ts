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
