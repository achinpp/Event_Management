import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

export const DEFAULT_HUMAN_MESSAGE_TEMPLATE = `Hey {name}! 👋 Hope you're having a wonderful day.

This is the team for "{event_title}". We're super excited to have you on our guest list! 

Could you let us know if you'll be able to join us? You can reply YES to confirm, NO to decline, or ask me any questions about the schedule, location, or parking!

You can also check your event details anytime here: {chat_link}`;

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
    // 1. Verify event ownership and fetch title
    const { data: event, error: eventError } = await db
      .from("events")
      .select("id, title, user_id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => ({}));
    const targetRegId = body.registrationId; // optional specific guest ID
    const customTemplate = body.templateMessage || DEFAULT_HUMAN_MESSAGE_TEMPLATE;

    // 3. Query targets
    let query = db
      .from("registrations")
      .select("id, full_name, phone, chat_token, invite_sent_at")
      .eq("event_id", eventId);

    if (targetRegId) {
      query = query.eq("id", targetRegId);
    } else {
      // Force send to pending/unsent attendees or all
      if (body.onlyUnsent !== false) {
        query = query.is("invite_sent_at", null);
      }
    }

    const { data: targets, error: targetError } = await query;
    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({
        success: true,
        dispatched: 0,
        message: targetRegId ? "Guest not found." : "No pending attendees requiring outreach.",
        logs: [],
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const outreachLogs = [];
    let dispatchedCount = 0;

    for (const reg of targets) {
      if (!reg.phone) {
        outreachLogs.push({
          recipient: reg.full_name || "Unknown",
          phone: "Missing",
          status: "Skipped: Missing phone number",
        });
        continue;
      }

      const chatLink = `${baseUrl}/chat/${reg.chat_token}`;
      const messageText = customTemplate
        .replace(/\{name\}/g, reg.full_name || "there")
        .replace(/\{event_title\}/g, event.title)
        .replace(/\{chat_link\}/g, chatLink);

      let deliveryStatus = "Dispatched";

      try {
        const waRes = await fetch("http://localhost:5001/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: reg.phone,
            message: messageText,
            recipient: reg.full_name,
          }),
        });

        if (!waRes.ok) {
          const errPayload = await waRes.json().catch(() => null);
          deliveryStatus = `Failed to queue: ${errPayload?.error ?? waRes.statusText}`;
        } else {
          deliveryStatus = "Queued for human-simulated delivery";
          dispatchedCount++;

          // Update invite_sent_at timestamp
          await db
            .from("registrations")
            .update({ invite_sent_at: new Date().toISOString() })
            .eq("id", reg.id);
        }
      } catch (err: any) {
        deliveryStatus = `Failed to connect to WhatsApp service: ${err.message}`;
      }

      outreachLogs.push({
        recipient: reg.full_name || reg.phone,
        phone: reg.phone,
        message: messageText,
        status: deliveryStatus,
      });
    }

    return NextResponse.json({
      success: true,
      dispatched: dispatchedCount,
      totalTargets: targets.length,
      logs: outreachLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to trigger outreach." },
      { status: 500 }
    );
  }
}
