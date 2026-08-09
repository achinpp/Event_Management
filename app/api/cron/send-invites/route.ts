import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface PendingRegistration {
  id: string;
  full_name: string | null;
  phone: string | null;
  chat_token: string;
  event_id: string;
  events: {
    title: string;
    starts_at: string | null;
    invite_lead_days: number;
  } | null;
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  try {
    // 1. Authorize using ADMIN_PASSWORD as token
    const token = new URL(req.url).searchParams.get("token") || req.headers.get("Authorization");
    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized. Missing or invalid token." }, { status: 401 });
    }

    const db = supabaseAdmin();

    // 2. Fetch all registrations that are pending invitation dispatch
    const { data: regs, error } = await db
      .from("registrations")
      .select("id, full_name, phone, chat_token, event_id, events (title, starts_at, invite_lead_days)")
      .is("invite_sent_at", null)
      .eq("rsvp_status", "pending");

    if (error) {
      return NextResponse.json({ error: `Database query error: ${error.message}` }, { status: 500 });
    }

    const pending = (regs || []) as unknown as PendingRegistration[];
    const dispatched = [];
    const skipped = [];

    const now = Date.now();

    // 3. Evaluate each pending registration against the event start time and lead days
    for (const reg of pending) {
      if (!reg.phone || !reg.events || !reg.events.starts_at) {
        skipped.push({ id: reg.id, reason: "Missing phone number or event details." });
        continue;
      }

      const event = reg.events;
      const startsAtStr = event.starts_at;
      if (!startsAtStr) continue;
      const startsAt = new Date(startsAtStr).getTime();
      const leadMs = (event.invite_lead_days ?? 7) * 24 * 60 * 60 * 1000;
      const sendAtTime = startsAt - leadMs;

      if (now >= sendAtTime) {
        const templateMessage = `Hey ${reg.full_name}! 👋 Hope you're having a wonderful day.

This is the team for "${event.title}". We're super excited to have you on our guest list! 

Could you let us know if you'll be able to join us? You can reply YES to confirm, NO to decline, or ask me any questions about the schedule, location, or parking!

You can also check your event details anytime here: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/chat/${reg.chat_token}`;

        try {
          // POST to local WhatsApp bot service queue
          const res = await fetch("http://localhost:5001/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: reg.phone,
              message: templateMessage,
              recipient: reg.full_name,
            }),
          });

          if (!res.ok) {
            const errPayload = await res.json().catch(() => null);
            throw new Error(errPayload?.error ?? res.statusText);
          }

          // Update invite_sent_at in Supabase
          const { error: updateError } = await db
            .from("registrations")
            .update({ invite_sent_at: new Date().toISOString() })
            .eq("id", reg.id);

          if (updateError) {
            console.error(`Failed to update invite_sent_at for ${reg.id}:`, updateError.message);
          }

          dispatched.push({
            id: reg.id,
            recipient: reg.full_name,
            phone: reg.phone,
            event: event.title,
          });
        } catch (err: any) {
          console.error(`Failed to dispatch scheduled WhatsApp for ${reg.id}:`, err.message);
          skipped.push({ id: reg.id, reason: `Failed to queue: ${err.message}` });
        }
      } else {
        skipped.push({
          id: reg.id,
          recipient: reg.full_name,
          reason: `Outreach window not open yet (Scheduled for ${new Date(sendAtTime).toLocaleString()}).`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: pending.length,
      dispatchedCount: dispatched.length,
      dispatched,
      skipped,
    });
  } catch (err: any) {
    console.error("Cron handler exception:", err);
    return NextResponse.json({ error: err.message || "Cron runner execution failed." }, { status: 500 });
  }
}
