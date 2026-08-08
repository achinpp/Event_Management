import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { embedQuery } from "@/lib/embeddings";

// Pinned model — see /decisions-log in CLAUDE.md.
const TEXT_MODEL = "gemini-3-flash-preview";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  venue: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token: string | undefined = body?.token;
  const messages: Array<{ role: string; content: string }> = body?.messages;

  if (!token || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: "token and messages are required" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Resolve token → registration + event.
  const { data: registration, error: regError } = await db
    .from("registrations")
    .select("*, events(*)")
    .eq("chat_token", token)
    .single();

  if (regError || !registration) {
    return NextResponse.json(
      { error: "invalid chat token" },
      { status: 404 }
    );
  }

  const event = registration.events as unknown as EventRow;
  const registrationId = registration.id as string;

  // Embed the latest user message for RAG retrieval.
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  let retrievedChunks: Array<{ content: string; similarity: number }> = [];

  if (lastUserMessage) {
    try {
      const queryEmbedding = await embedQuery(lastUserMessage.content);
      const { data: chunks } = await db.rpc("match_event_chunks", {
        p_event_id: event.id,
        p_embedding: queryEmbedding,
        p_limit: 5,
      });
      if (chunks) retrievedChunks = chunks;
    } catch (err) {
      console.error("RAG retrieval failed:", err);
    }
  }

  // Build system prompt with event facts + retrieved context.
  const facts = [
    `Event: ${event.title}`,
    event.starts_at && `Date: ${new Date(event.starts_at).toLocaleString()}`,
    event.venue && `Venue: ${event.venue}`,
    event.description && `Description: ${event.description}`,
    event.contact_name && `Contact: ${event.contact_name}`,
    event.contact_email && `Email: ${event.contact_email}`,
    event.contact_phone && `Phone: ${event.contact_phone}`,
  ]
    .filter(Boolean)
    .join("\n");

  const context =
    retrievedChunks.length > 0
      ? `\n\nRelevant information:\n${retrievedChunks.map((c) => c.content).join("\n\n")}`
      : "";

  const systemPrompt = `You are a helpful assistant for the event "${event.title}". Answer attendee questions using ONLY the following information. If you don't know the answer, say so and suggest they contact the organizer.

${facts}${context}

You have a tool called "confirmAttendance" to confirm or decline the attendee's RSVP. Use it when the attendee clearly indicates they will attend (confirm) or won't attend (decline). Do NOT use the tool if the user is just asking a question.

If the attendee asks to speak to a human or needs help beyond what you know, provide the contact information above.`;

  const confirmSchema = z.object({
    status: z
      .enum(["confirmed", "declined"])
      .describe("The attendance status"),
  });

  const result = streamText({
    model: google(TEXT_MODEL),
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    tools: {
      confirmAttendance: tool({
        description:
          "Confirm or decline the attendee's RSVP for the event. Use 'confirmed' when they say they will attend, 'declined' when they say they won't.",
        inputSchema: confirmSchema,
        execute: async ({ status }: z.infer<typeof confirmSchema>) => {
          const { error } = await db
            .from("registrations")
            .update({
              rsvp_status: status,
              rsvp_at: new Date().toISOString(),
            })
            .eq("id", registrationId);

          if (error) {
            return { success: false, message: "Failed to update RSVP" };
          }
          return {
            success: true,
            message:
              status === "confirmed"
                ? `Great! Your attendance is confirmed for ${event.title}. See you there! 🎉`
                : `Your RSVP has been updated. We're sorry you can't make it to ${event.title}.`,
          };
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toTextStreamResponse();
}
