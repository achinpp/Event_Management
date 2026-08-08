import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Dashboard polls this every 2s via SWR (/rules #5 — no Realtime).
export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const db = supabaseAdmin();
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
