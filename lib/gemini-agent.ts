import { generateImage, fetchLogoInline } from "./gemini-image";
import { supabaseAdmin } from "./supabase";

export interface GeminiDesignResult {
  imageUrl: string;
}

export async function generatePostDesign(params: {
  postId: string;
  eventId: string;
  title: string;
  venue?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  imageBrief: string;
}): Promise<GeminiDesignResult> {
  const { postId, eventId, title, venue, description, logoUrl, imageBrief } = params;

  console.log(`[Gemini Image Generator] Generating image for post ${postId}...`);
  let logo;
  if (logoUrl) {
    logo = await fetchLogoInline(logoUrl).catch(() => undefined);
  }

  const image = await generateImage(
    `Create a square social media event poster graphic.

Event Title: ${title}${venue ? `, ${venue}` : ""}
Description: ${description ?? "No additional description provided."}

Image creative brief: ${imageBrief}

Style: modern, polished visual layout, clean typography, vibrant high-quality event banner aesthetics.`,
    logo
  );

  const db = supabaseAdmin();
  const ext = image.mimeType?.includes("svg") ? "svg" : "png";
  const path = `${eventId}/${postId}-${Date.now()}.${ext}`;

  let imageUrl: string;
  const { error: uploadError } = await db.storage
    .from("posts")
    .upload(path, image.bytes, { contentType: image.mimeType, upsert: true });

  if (!uploadError) {
    imageUrl = db.storage.from("posts").getPublicUrl(path).data.publicUrl;
  } else {
    console.warn(`Storage upload warning (${uploadError.message}), using Data URI fallback.`);
    imageUrl = `data:${image.mimeType};base64,${image.bytes.toString("base64")}`;
  }

  return { imageUrl };
}
