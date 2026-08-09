import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface GuestInput {
  full_name: string;
  email: string;
  phone: string;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await ctx.params;
  const db = supabaseAdmin();

  try {
    // 1. Verify event exists
    const { data: event, error: eventError } = await db
      .from("events")
      .select("id, title, starts_at, invite_lead_days")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Calculate timing
    const startsAtStr = event.starts_at;
    const inviteLeadDays = event.invite_lead_days ?? 7;
    
    let shouldSendNow = true;
    let sendAtTime = 0;
    
    if (startsAtStr) {
      const startsAt = new Date(startsAtStr).getTime();
      const leadMs = inviteLeadDays * 24 * 60 * 60 * 1000;
      sendAtTime = startsAt - leadMs;
      
      const now = Date.now();
      if (sendAtTime > now) {
        shouldSendNow = false;
      }
    }

    // 2. Parse request body
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.guests)) {
      return NextResponse.json(
        { error: "Invalid request payload. Must contain a 'guests' array." },
        { status: 400 }
      );
    }

    const rawGuests: GuestInput[] = body.guests;

    // Validate inputs
    const validGuests = rawGuests.filter(
      (g) => g.full_name?.trim() && g.email?.trim() && g.phone?.trim()
    );

    if (validGuests.length === 0) {
      return NextResponse.json(
        { error: "No valid guests found with name, email, and phone number." },
        { status: 400 }
      );
    }

    // 3. Deduplication by Email for this event
    // Fetch all existing emails registered for this event
    const { data: existingRegs, error: fetchError } = await db
      .from("registrations")
      .select("email")
      .eq("event_id", eventId);

    if (fetchError) {
      return NextResponse.json(
        { error: `Database fetch error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const registeredEmails = new Set(
      existingRegs?.map((r) => r.email?.trim().toLowerCase()).filter(Boolean) || []
    );

    // Filter guests to insert only non-registered emails
    const newGuestsToInsert = [];
    let duplicatesSkipped = 0;

    for (const guest of validGuests) {
      const emailLower = guest.email.trim().toLowerCase();
      if (registeredEmails.has(emailLower)) {
        duplicatesSkipped++;
      } else {
        newGuestsToInsert.push({
          event_id: eventId,
          full_name: guest.full_name.trim(),
          email: guest.email.trim(),
          phone: guest.phone.trim(),
          rsvp_status: "pending",
          invite_sent_at: shouldSendNow ? new Date().toISOString() : null,
        });
      }
    }

    if (newGuestsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        skipped: duplicatesSkipped,
        logs: [],
        message: "All uploaded guests are already registered for this event.",
      });
    }

    // 4. Bulk Insert new registrations
    const { data: inserted, error: insertError } = await db
      .from("registrations")
      .insert(newGuestsToInsert)
      .select("id, full_name, email, phone, chat_token, invite_sent_at");

    if (insertError) {
      return NextResponse.json(
        { error: `Database insert error: ${insertError.message}` },
        { status: 500 }
      );
    }

    // 5. Trigger actual WhatsApp outreach via our background queue (if shouldSendNow)
    const outreachLogs = [];
    for (const row of inserted) {
      const templateMessage = `Hi ${row.full_name}! 🚀 You are registered for "${event.title}". Can we count on your attendance? Reply YES to confirm, NO to decline, or ask any questions about the event! Chat link: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/chat/${row.chat_token}`;
      
      let status = "Delivered (WhatsApp Bot RAG Ready)";
      
      if (!shouldSendNow) {
        status = `Scheduled (will send on ${new Date(sendAtTime).toLocaleString()})`;
      } else {
        try {
          const waRes = await fetch("http://localhost:5001/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: row.phone,
              message: templateMessage,
              recipient: row.full_name,
            }),
          });
          
          if (!waRes.ok) {
            const errPayload = await waRes.json().catch(() => null);
            status = `Failed to queue: ${errPayload?.error ?? waRes.statusText}`;
          } else {
            status = "Queued for human-simulated delivery";
          }
        } catch (err: any) {
          status = `Failed to connect to WhatsApp service: ${err.message}`;
        }
      }

      outreachLogs.push({
        recipient: row.full_name,
        phone: row.phone,
        message: templateMessage,
        status: status,
      });
    }

    return NextResponse.json({
      success: true,
      added: inserted.length,
      skipped: duplicatesSkipped,
      logs: outreachLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process registrations upload." },
      { status: 500 }
    );
  }
}
