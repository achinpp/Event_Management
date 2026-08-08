import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { embedChunks } from "@/lib/embeddings";

const createEvent = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  starts_at: z.string().optional(),
  venue: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  logo_url: z.string().optional(),
});

function paragraphChunks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

async function chunkAndEmbed(eventId: string, description: string) {
  const chunks = paragraphChunks(description);
  if (chunks.length === 0) return;
  const embeddings = await embedChunks(chunks);
  const db = supabaseAdmin();
  const { error } = await db.from("event_chunks").insert(
    chunks.map((content, i) => ({
      event_id: eventId,
      content,
      embedding: embeddings[i],
    }))
  );
  if (error) throw new Error(error.message);
}

export async function GET() {
  const db = supabaseAdmin();
  const { data: events, error } = await db
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Backfill chunks for events created before the embedding pipeline
  // existed (the seed event). Runs at most once per event.
  const withDescription = events.filter((e) => e.description);
  if (withDescription.length > 0) {
    const { data: existing } = await db
      .from("event_chunks")
      .select("event_id")
      .in(
        "event_id",
        withDescription.map((e) => e.id)
      );
    const chunked = new Set((existing ?? []).map((r) => r.event_id));
    for (const event of withDescription) {
      if (chunked.has(event.id)) continue;
      try {
        await chunkAndEmbed(event.id, event.description);
      } catch (err) {
        console.error(`chunk backfill failed for event ${event.id}:`, err);
      }
    }
  }

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const parsed = createEvent.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const { data: event, error } = await db
    .from("events")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await chunkAndEmbed(event.id, event.description);
  } catch (err) {
    // Log embedding failure but don't block event creation
    console.warn(`embedding failed for event ${event.id}:`, err);
    // Chat will still work, just without RAG context
  }

  return NextResponse.json({ event }, { status: 201 });
}
