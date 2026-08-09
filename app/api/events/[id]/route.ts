import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { embedChunks } from "@/lib/embeddings";

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  starts_at: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  status: z.string().optional(),
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

// Workspace payload: event + variants + registrations in one round trip.
// The workspace polls this every 2s (skeletons during generation, and the
// live registrations table in phase 5).
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const [eventRes, postsRes, registrationsRes] = await Promise.all([
    db.from("events").select("*").eq("id", id).maybeSingle(),
    db
      .from("generated_posts")
      .select("*")
      .eq("event_id", id)
      .order("variant_index"),
    db
      .from("registrations")
      .select("id, full_name, email, phone, rsvp_status, rsvp_at, chat_token, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const error = eventRes.error ?? postsRes.error ?? registrationsRes.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!eventRes.data) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  return NextResponse.json({
    event: eventRes.data,
    posts: postsRes.data,
    registrations: registrationsRes.data,
  });
}

// Update event details and optionally rebuild text embeddings if description changed
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const parsed = updateEventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const { data: event, error } = await db
    .from("events")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  // If description was updated, rebuild knowledge base embeddings
  if (parsed.data.description !== undefined) {
    try {
      await db.from("event_chunks").delete().eq("event_id", id);
      await chunkAndEmbed(id, parsed.data.description);
    } catch (err) {
      console.error(`embedding rebuild failed for event ${id}:`, err);
    }
  }

  return NextResponse.json({ event });
}

// Delete event (referencing generated_posts, registrations, and chunks cascade-delete automatically)
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = supabaseAdmin();
  const { error } = await db.from("events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
