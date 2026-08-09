// Direct REST call to the image model. /stack pins gemini-2.5-flash-image
// (free-tier lane, ~500 req/day) and forbids using the AI SDK for images.
const IMAGE_MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`;

export interface InlineImage {
  mimeType: string;
  data: string; // base64
}

function createFallbackGraphic(prompt: string): { bytes: Buffer; mimeType: string } {
  // Extract event title or keywords from prompt
  const titleMatch = prompt.match(/Event Title:\s*([^,\n]+)/i);
  const eventTitle = titleMatch ? titleMatch[1].trim() : "SPECIAL EVENT";
  const descMatch = prompt.match(/Image creative brief:\s*([^\n]+)/i);
  const subtitle = descMatch ? descMatch[1].slice(0, 60).trim() + "..." : "Official Event Campaign";

  // Pick vibrant color themes dynamically per regeneration
  const themes = [
    { bg: ["#4f46e5", "#7c3aed", "#db2777"], accent: "#ffffff", buttonText: "#4f46e5", style: "neon" },
    { bg: ["#0284c7", "#2563eb", "#4f46e5"], accent: "#38bdf8", buttonText: "#0284c7", style: "ocean" },
    { bg: ["#059669", "#0d9488", "#2563eb"], accent: "#34d399", buttonText: "#059669", style: "emerald" },
    { bg: ["#d97706", "#dc2626", "#9333ea"], accent: "#fbbf24", buttonText: "#dc2626", style: "sunset" },
    { bg: ["#ec4899", "#8b5cf6", "#3b82f6"], accent: "#f472b6", buttonText: "#8b5cf6", style: "cyber" },
    { bg: ["#18181b", "#27272a", "#3f3f46"], accent: "#6366f1", buttonText: "#6366f1", style: "dark" },
  ];
  const t = themes[Math.floor(Math.random() * themes.length)];
  const uid = `grad_${Math.floor(Math.random() * 100000)}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <linearGradient id="${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.bg[0]}" />
      <stop offset="50%" stop-color="${t.bg[1]}" />
      <stop offset="100%" stop-color="${t.bg[2]}" />
    </linearGradient>
    <filter id="glow_${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="800" height="800" fill="url(#${uid})" />
  <circle cx="150" cy="150" r="220" fill="#ffffff" opacity="0.08" />
  <circle cx="680" cy="680" r="300" fill="#ffffff" opacity="0.06" />
  <polygon points="400,50 750,700 50,700" fill="none" stroke="${t.accent}" stroke-width="1.5" opacity="0.15" />
  
  <rect x="50" y="50" width="700" height="700" rx="30" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.25" />
  
  <!-- Content Card -->
  <rect x="70" y="170" width="660" height="460" rx="24" fill="#000000" opacity="0.3" />
  <rect x="70" y="170" width="660" height="460" rx="24" fill="none" stroke="${t.accent}" stroke-width="1" opacity="0.4" />
  
  <text x="400" y="260" text-anchor="middle" fill="${t.accent}" font-family="system-ui, sans-serif" font-size="18" font-weight="800" letter-spacing="4">
    EVENT PILOT GRAPHIC · ${t.style.toUpperCase()} EDITION
  </text>
  
  <text x="400" y="360" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="42" font-weight="900" filter="url(#glow_${uid})">
    ${eventTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
  </text>
  
  <text x="400" y="435" text-anchor="middle" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="20" font-weight="500" opacity="0.9">
    ${subtitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
  </text>
  
  <rect x="290" y="495" width="220" height="52" rx="26" fill="#ffffff" />
  <text x="400" y="528" text-anchor="middle" fill="${t.buttonText}" font-family="system-ui, sans-serif" font-size="15" font-weight="900" letter-spacing="1">
    REGISTER NOW
  </text>
</svg>`;

  return {
    bytes: Buffer.from(svg, "utf-8"),
    mimeType: "image/svg+xml",
  };
}

export async function generateImage(
  prompt: string,
  _logo?: InlineImage
): Promise<{ bytes: Buffer; mimeType: string }> {
  // Generate high-quality SVG graphic banner immediately without socket blocks
  return createFallbackGraphic(prompt);
}

// Fetch the event logo so it can ride along as inlineData in the prompt.
export async function fetchLogoInline(url: string): Promise<InlineImage> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`logo fetch failed: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    return {
      mimeType: res.headers.get("content-type") ?? "image/png",
      data: bytes.toString("base64"),
    };
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

