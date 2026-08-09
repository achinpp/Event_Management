import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

// Dashboard polls this every 2s via SWR (/rules #5 — no Realtime).
export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Verify ownership
  const { data: event, error: eventError } = await db
    .from("events")
    .select("user_id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: registrations, error } = await db
    .from("registrations")
    .select("id, full_name, email, rsvp_status, rsvp_at, chat_token, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ registrations });
}

