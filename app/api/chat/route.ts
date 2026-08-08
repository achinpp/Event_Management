import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { streamText, tool, stepCountIs, ModelMessage } from "ai";
import { supabaseAdmin } from "@/lib/supabase";
import { embedQuery } from "@/lib/embeddings";

// /rules #3: chat messages are NEVER persisted. Conversation state lives in
// the client and arrives with each request; nothing here writes message
// bodies anywhere. No tracing on this route.

// See CLAUDE.md /decisions-log for the model ID change.
const TEXT_MODEL = "gemini-3-flash-preview";

const chatBody = z.object({
  token: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1),
});

interface RegistrationWithEvent {
  id: string;
  full_name: string | null;
  rsvp_status: string;
  events: {
    id: string;
    title: string;
    starts_at: string | null;
    venue: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  } | null;
}

async function resolveToken(token: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("registrations")
    .select(
      "id, full_name, rsvp_status, events (id, title, starts_at, venue, contact_name, contact_email, contact_phone)"
    )
    .eq("chat_token", token)
    .maybeSingle<RegistrationWithEvent>();
  if (!data?.events) return null;
  return data;
}

// Chat page header + RSVP success state poll: status only, never messages.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  const reg = await resolveToken(token);
  if (!reg) {
    return NextResponse.json({ error: "invalid chat link" }, { status: 404 });
  }
  return NextResponse.json({
    event: { title: reg.events!.title },
    registration: { full_name: reg.full_name, rsvp_status: reg.rsvp_status },
  });
}

export async function POST(req: Request) {
  const parsed = chatBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "body must be { token, messages }" },
      { status: 400 }
    );
  }
  const { token, messages } = parsed.data;

  const reg = await resolveToken(token);
  if (!reg) {
    return NextResponse.json({ error: "invalid chat link" }, { status: 404 });
  }
  const event = reg.events!;
  const db = supabaseAdmin();

  // Retrieve only this event's knowledge: match_event_chunks requires the
  // event_id argument, so isolation is structural, not prompt-based.
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const embedding = await embedQuery(lastUserMessage);
  const { data: chunks, error: matchError } = await db.rpc(
    "match_event_chunks",
    { p_event_id: event.id, p_embedding: embedding, p_limit: 5 }
  );
  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  const knowledge = (chunks as Array<{ content: string }> | null)
    ?.map((c) => `- ${c.content}`)
    .join("\n");

  const system = `You are the friendly assistant for the event "${event.title}".
You are chatting with ${reg.full_name ?? "an attendee"} who registered for this event.

Event facts:
- Title: ${event.title}
- Date: ${event.starts_at ?? "not announced yet"}
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

  const result = streamText({
    model: google(TEXT_MODEL),
    system,
    messages: messages as ModelMessage[],
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
    stopWhen: stepCountIs(3),
  });

  return result.toTextStreamResponse();
}
