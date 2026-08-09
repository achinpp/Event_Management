// Image generation supporting Cloudflare Workers AI (REST API) with fallback to Gemini.
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

// Default Cloudflare text-to-image model
const DEFAULT_CF_MODEL = "@cf/black-forest-labs/flux-1-schnell";

export interface InlineImage {
  mimeType: string;
  data: string; // base64
}

function cleanEnv(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let cleaned = val.trim();
  // Strip surrounding quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned || undefined;
}

/**
 * Generate image using Cloudflare Workers AI if configured,
 * otherwise fall back to Google Gemini REST API.
 */
export async function generateImage(
  prompt: string,
  logo?: InlineImage
): Promise<{ bytes: Buffer; mimeType: string }> {
  const cfAccountId = cleanEnv(process.env.CLOUDFLARE_ACCOUNT_ID);
  let cfApiToken = cleanEnv(
    process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY
  );

  if (cfAccountId && cfApiToken) {
    // If token accidentally contains "Bearer ", strip it
    if (cfApiToken.toLowerCase().startsWith("bearer ")) {
      cfApiToken = cfApiToken.slice(7).trim();
    }
    return generateCloudflareImage(prompt, cfAccountId, cfApiToken);
  }

  return generateGeminiImage(prompt, logo);
}

/**
 * Cloudflare Workers AI REST API execution
 * Endpoint: https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
 */
async function generateCloudflareImage(
  prompt: string,
  accountId: string,
  apiToken: string
): Promise<{ bytes: Buffer; mimeType: string }> {
  const model =
    cleanEnv(process.env.CLOUDFLARE_IMAGE_MODEL) || DEFAULT_CF_MODEL;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  // Build payload suitable for Cloudflare Workers AI text-to-image
  const bodyPayload: Record<string, unknown> = {
    prompt: prompt.slice(0, 1500),
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(
      `Cloudflare AI ${res.status} (${model}): ${detail}. Verify CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.`
    );
  }

  const contentType = res.headers.get("content-type") || "";

  // Cloudflare models returning raw binary image bytes
  if (
    contentType.includes("image/") ||
    contentType.includes("application/octet-stream")
  ) {
    const arrayBuffer = await res.arrayBuffer();
    return {
      bytes: Buffer.from(arrayBuffer),
      mimeType: contentType.includes("image/jpeg") ? "image/jpeg" : "image/png",
    };
  }

  // Cloudflare models returning JSON with base64 encoded image
  const json = (await res.json()) as {
    result?: { image?: string; response?: string };
    image?: string;
    errors?: Array<{ message: string }>;
    messages?: Array<string>;
  };

  if (json.errors && json.errors.length > 0) {
    throw new Error(`Cloudflare AI error: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  const base64Data = json.result?.image || json.result?.response || json.image;
  if (!base64Data) {
    throw new Error(`Cloudflare AI returned no image data: ${JSON.stringify(json).slice(0, 300)}`);
  }

  return {
    bytes: Buffer.from(base64Data, "base64"),
    mimeType: "image/png",
  };
}

/**
 * Google Gemini REST API fallback
 */
async function generateGeminiImage(
  prompt: string,
  logo?: InlineImage
): Promise<{ bytes: Buffer; mimeType: string }> {
  const key = cleanEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (!key) {
    throw new Error(
      "No image credentials found. Please set CLOUDFLARE_ACCOUNT_ID & CLOUDFLARE_API_TOKEN (or GOOGLE_GENERATIVE_AI_API_KEY) in .env.local"
    );
  }

  const parts: Array<{ text: string } | { inlineData: InlineImage }> = [
    { text: prompt },
  ];
  if (logo) parts.push({ inlineData: logo });

  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { imageConfig: { aspectRatio: "1:1" } },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(`Gemini image API ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: InlineImage }> };
    }>;
  };
  const image = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data
  )?.inlineData;
  if (!image) throw new Error("Gemini image API returned no image data");

  return {
    bytes: Buffer.from(image.data, "base64"),
    mimeType: image.mimeType || "image/png",
  };
}

// Fetch the event logo so it can ride along as inlineData in prompts
export async function fetchLogoInline(url: string): Promise<InlineImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  return {
    mimeType: res.headers.get("content-type") ?? "image/png",
    data: bytes.toString("base64"),
  };
}
