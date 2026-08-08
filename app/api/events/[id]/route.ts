import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();

  const [eventRes, postsRes, regsRes] = await Promise.all([
    db.from("events").select("*").eq("id", id).single(),
    db
      .from("generated_posts")
      .select("*")
      .eq("event_id", id)
      .order("variant_index"),
    db
      .from("registrations")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (eventRes.error) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  return NextResponse.json({
    event: eventRes.data,
    posts: postsRes.data ?? [],
    registrations: regsRes.data ?? [],
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // If updating a post (postId + fields), handle that branch.
  if (body.postId) {
    const { postId, ...fields } = body;
    const allowed = ["final_caption", "scheduled_at", "status"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in fields) update[key] = fields[key];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "no valid fields" }, { status: 400 });
    }
    const { data, error } = await db
      .from("generated_posts")
      .update(update)
      .eq("id", postId)
      .eq("event_id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ post: data });
  }

  // Otherwise update the event itself.
  const allowed = [
    "title",
    "description",
    "starts_at",
    "venue",
    "contact_name",
    "contact_email",
    "contact_phone",
    "logo_url",
    "status",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no valid fields" }, { status: 400 });
  }
  const { data, error } = await db
    .from("events")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ event: data });
}
