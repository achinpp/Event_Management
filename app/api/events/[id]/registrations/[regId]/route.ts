import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; regId: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, regId } = await ctx.params;
  const db = supabaseAdmin();

  try {
    // 1. Verify event ownership
    const { data: event } = await db
      .from("events")
      .select("id, user_id")
      .eq("id", eventId)
      .maybeSingle();

    if (!event || event.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse payload
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (body.full_name !== undefined) updates.full_name = String(body.full_name).trim();
    if (body.email !== undefined) updates.email = body.email ? String(body.email).trim().toLowerCase() : null;
    if (body.phone !== undefined) updates.phone = body.phone ? String(body.phone).trim() : null;
    if (body.rsvp_status !== undefined) {
      updates.rsvp_status = body.rsvp_status;
      if (body.rsvp_status === "confirmed" || body.rsvp_status === "declined") {
        updates.rsvp_at = new Date().toISOString();
      }
    }

    // 3. Update registration
    const { data: updated, error: updateError } = await db
      .from("registrations")
      .update(updates)
      .eq("id", regId)
      .eq("event_id", eventId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, registration: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update registration" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; regId: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, regId } = await ctx.params;
  const db = supabaseAdmin();

  try {
    // Verify ownership
    const { data: event } = await db
      .from("events")
      .select("id, user_id")
      .eq("id", eventId)
      .maybeSingle();

    if (!event || event.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await db
      .from("registrations")
      .delete()
      .eq("id", regId)
      .eq("event_id", eventId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete registration" }, { status: 500 });
  }
}
