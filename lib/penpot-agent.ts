import { penpotMCP } from "./penpot-mcp";
import { generateImage, fetchLogoInline } from "./gemini-image";
import { supabaseAdmin } from "./supabase";

export interface PenpotDesignResult {
  imageUrl: string;
  penpotUrl?: string;
  penpotFileId?: string;
  usedFallback: boolean;
}

export async function generatePenpotPostDesign(params: {
  postId: string;
  eventId: string;
  title: string;
  venue?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  imageBrief: string;
}): Promise<PenpotDesignResult> {
  const { postId, eventId, title, venue, description, logoUrl, imageBrief } = params;

  // 1. Attempt Penpot MCP workflow
  try {
    const client = await penpotMCP.getClient();
    if (client) {
      const tools = await penpotMCP.listTools();
      console.log(`[Penpot Agent] Successfully connected to Penpot MCP. Available tools: ${tools.map(t => t.name).join(", ")}`);

      // Execute Penpot design generation tool if available
      // Note: If penpot server has a specific file creation or export tool:
      const createOrExportTool = tools.find(t => t.name.includes("export") || t.name.includes("render") || t.name.includes("create") || t.name.includes("file"));

      if (createOrExportTool) {
        const result = await penpotMCP.callTool(createOrExportTool.name, {
          title,
          brief: imageBrief,
          venue: venue ?? undefined,
        }) as { imageUrl?: string; fileId?: string; fileUrl?: string };

        if (result?.imageUrl) {
          return {
            imageUrl: result.imageUrl,
            penpotUrl: result.fileUrl ?? `http://194.233.95.35:9001/#/workspace/file/${result.fileId ?? "draft"}`,
            penpotFileId: result.fileId,
            usedFallback: false,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[Penpot Agent] MCP Server interaction failed or tools not ready, proceeding with Gemini Flash fallback:", err);
  }

  // 2. Fallback / Standard Gemini Flash Image Generation
  console.log("[Penpot Agent] Using Gemini Flash Image Generator for post creation.");
  let logo;
  if (logoUrl) {
    logo = await fetchLogoInline(logoUrl).catch(() => undefined);
  }

  const image = await generateImage(
    `Create a square social media event poster graphic.

Event Title: ${title}${venue ? `, ${venue}` : ""}
Description: ${description ?? "No additional description provided."}

Image creative brief: ${imageBrief}

Style: modern, polished visual layout, clean typography.`,
    logo
  );

  const db = supabaseAdmin();
  const path = `${eventId}/${postId}-${Date.now()}.png`;
  const { error: uploadError } = await db.storage
    .from("posts")
    .upload(path, image.bytes, { contentType: image.mimeType, upsert: true });

  if (uploadError) {
    throw new Error(`Failed to upload generated post image: ${uploadError.message}`);
  }

  const imageUrl = db.storage.from("posts").getPublicUrl(path).data.publicUrl;

  // Generate Penpot workspace link format for direct editing
  const penpotWorkspaceUrl = `http://194.233.95.35:9001/#/workspace/file/${postId}`;

  return {
    imageUrl,
    penpotUrl: penpotWorkspaceUrl,
    penpotFileId: postId,
    usedFallback: true,
  };
}
