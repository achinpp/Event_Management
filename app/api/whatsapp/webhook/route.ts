import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { supabaseAdmin } from "@/lib/supabase";
import { embedQuery } from "@/lib/embeddings";

const TEXT_MODEL = "gemini-3-flash-preview";

const webhookBody = z.object({
  phone: z.string().min(1),
  message: z.string().min(1),
});

interface RegistrationWithEvent {
  id: string;
  full_name: string | null;
  rsvp_status: string;
  event_id: string;
  events: any;
}

export async function POST(req: Request) {
  try {
    const parsed = webhookBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Body must contain 'phone' and 'message'." },
        { status: 400 }
      );
    }

    const { phone, message } = parsed.data;
    const db = supabaseAdmin();

    // 1. Find registration record matching the phone number (latest registration first)
    const { data: regs, error: fetchRegError } = await db
      .from("registrations")
      .select(
        "id, full_name, rsvp_status, event_id, events (id, title, starts_at, venue, contact_name, contact_email, contact_phone)"
      )
      .eq("phone", phone)
      .order("created_at", { ascending: false });

    if (fetchRegError) {
      return NextResponse.json(
        { error: `Database search error: ${fetchRegError.message}` },
        { status: 500 }
      );
    }

    const reg = regs?.[0] as RegistrationWithEvent | undefined;
    if (!reg || !reg.events) {
      // The sender is not registered for any active events, ignore silently or return 404
      return NextResponse.json(
        { error: "Sender phone number is not registered for any active events." },
        { status: 404 }
      );
    }

    const event = Array.isArray(reg.events) ? reg.events[0] : reg.events;
    if (!event) {
      return NextResponse.json(
        { error: "Sender phone number is not registered for any active events." },
        { status: 404 }
      );
    }

    // 2. Persist the incoming user message to chat_messages history
    const { error: insertUserMsgError } = await db
      .from("chat_messages")
      .insert({
        registration_id: reg.id,
        role: "user",
        content: message,
      });

    if (insertUserMsgError) {
      console.error("Failed to save incoming message to database:", insertUserMsgError.message);
    }

    // 3. Fetch past conversation history (limit to last 8 messages to keep prompt clean)
    const { data: history, error: historyError } = await db
      .from("chat_messages")
      .select("role, content")
      .eq("registration_id", reg.id)
      .order("created_at", { ascending: true })
      .limit(8);

    if (historyError) {
      console.error("Failed to retrieve chat history:", historyError.message);
    }

    const formattedHistory = history || [];

    // 4. Retrieve event training knowledge using RAG vector similarity search
    const embedding = await embedQuery(message);
    const { data: chunks, error: matchError } = await db.rpc(
      "match_event_chunks",
      { p_event_id: event.id, p_embedding: embedding, p_limit: 5 }
    );

    if (matchError) {
      console.error("RAG search match error:", matchError.message);
    }

    const knowledge = (chunks as Array<{ content: string }> | null)
      ?.map((c) => `- ${c.content}`)
      .join("\n");

    // 5. Construct AI System Prompt
    const system = `You are the friendly assistant for the event "${event.title}".
You are chatting with ${reg.full_name ?? "an attendee"} who registered for this event.

Event facts:
- Title: ${event.title}
- Date: ${event.starts_at ? new Date(event.starts_at).toLocaleString() : "not announced yet"}
- Venue: ${event.venue ?? "not announced yet"}

Event knowledge base:
${knowledge || "- (no additional details available)"}

Contact (share when asked for a human or for something you can't answer):
- Name: ${event.contact_name ?? "the organizers"}
- Email: ${event.contact_email ?? "not provided"}
- Phone: ${event.contact_phone ?? "not provided"}

Rules:
- Answer ONLY from the facts and knowledge base above. If the answer isn't
  there, say you don't know and point to the contact above. Never invent
  details, and never answer questions about other events.
- When the attendee clearly states they will attend (e.g. "I'll be there",
  "count me in") call confirmAttendance with status "confirmed". If they
  clearly decline, call it with status "declined". Then confirm warmly in
  one short sentence. Don't call the tool for mere maybes.
- Keep replies short and conversational.`;

    // 6. Generate Response using Gemini
    const result = await generateText({
      model: google(TEXT_MODEL),
      system,
      // Map history records to Vercel AI SDK message format
      messages: formattedHistory.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      tools: {
        confirmAttendance: tool({
          description:
            "Record the attendee's RSVP once they clearly state whether they will attend.",
          inputSchema: z.object({
            status: z.enum(["confirmed", "declined"]),
          }),
          execute: async ({ status }) => {
            const { error } = await db
              .from("registrations")
              .update({ rsvp_status: status, rsvp_at: new Date().toISOString() })
              .eq("id", reg.id);
            if (error) return { saved: false };
            return { saved: true, status };
          },
        }),
      },
    });

    // 7. Persist AI assistant's reply to database history
    const { error: insertAssistantMsgError } = await db
      .from("chat_messages")
      .insert({
        registration_id: reg.id,
        role: "assistant",
        content: result.text,
      });

    if (insertAssistantMsgError) {
      console.error("Failed to save assistant response to database:", insertAssistantMsgError.message);
    }

    return NextResponse.json({ reply: result.text });
  } catch (err: any) {
    console.error("WhatsApp webhook server error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process incoming message." },
      { status: 500 }
    );
  }
}
