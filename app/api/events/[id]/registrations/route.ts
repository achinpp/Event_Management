import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await ctx.params;
  const db = supabaseAdmin();

  try {
    // 1. Verify event ownership
    const { data: event, error: eventError } = await db
      .from("events")
      .select("id, user_id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => null);
    if (!body || !body.full_name || (!body.email && !body.phone)) {
      return NextResponse.json(
        { error: "Attendee must have a full name and at least an email or phone number." },
        { status: 400 }
      );
    }

    const full_name = String(body.full_name).trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const rsvp_status = body.rsvp_status || "pending";

    // 3. Check for duplicate email or phone if provided
    if (email) {
      const { data: existing } = await db
        .from("registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: `An attendee with email '${email}' is already registered for this event.` },
          { status: 400 }
        );
      }
    }

    // 4. Create registration record
    const { data: newReg, error: insertError } = await db
      .from("registrations")
      .insert({
        event_id: eventId,
        full_name,
        email,
        phone,
        rsvp_status,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create attendee: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, registration: newReg }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to add attendee." },
      { status: 500 }
    );
  }
}
