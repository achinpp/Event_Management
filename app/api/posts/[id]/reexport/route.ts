import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { penpotMCP } from "@/lib/penpot-mcp";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const { data: post, error } = await db
    .from("generated_posts")
    .select("id, event_id, penpot_file_id, image_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  try {
    const client = await penpotMCP.getClient();
    if (client && post.penpot_file_id) {
      // Re-export from Penpot MCP server if available
      const exportResult = (await penpotMCP.callTool("export_frame", {
        fileId: post.penpot_file_id,
      })) as { imageUrl?: string };

      if (exportResult?.imageUrl) {
        await db
          .from("generated_posts")
          .update({ image_url: exportResult.imageUrl })
          .eq("id", id);
        return NextResponse.json({ imageUrl: exportResult.imageUrl, synced: true });
      }
    }

    return NextResponse.json({
      imageUrl: post.image_url,
      synced: false,
      message: "Re-export ready using saved graphics",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to re-export from Penpot" },
      { status: 500 }
    );
  }
}
