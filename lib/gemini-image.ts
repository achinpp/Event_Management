// Direct REST call to the image model. /stack pins gemini-2.5-flash-image
// (free-tier lane, ~500 req/day) and forbids using the AI SDK for images.
const IMAGE_MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`;

export interface InlineImage {
  mimeType: string;
  data: string; // base64
}

export async function generateImage(
  prompt: string,
  logo?: InlineImage
): Promise<{ bytes: Buffer; mimeType: string }> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

  const parts: Array<{ text: string } | { inlineData: InlineImage }> = [
    { text: prompt },
  ];
  if (logo) parts.push({ inlineData: logo });

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { imageConfig: { aspectRatio: "1:1" } },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(`gemini image API ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: InlineImage }> };
    }>;
  };
  const image = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data
  )?.inlineData;
  if (!image) throw new Error("gemini image API returned no image data");

  return {
    bytes: Buffer.from(image.data, "base64"),
    mimeType: image.mimeType || "image/png",
  };
}

// Fetch the event logo so it can ride along as inlineData in the prompt.
export async function fetchLogoInline(url: string): Promise<InlineImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`logo fetch failed: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  return {
    mimeType: res.headers.get("content-type") ?? "image/png",
    data: bytes.toString("base64"),
  };
}
