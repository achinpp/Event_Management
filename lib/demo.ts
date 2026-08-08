// DEMO_MODE fixtures (/rules #10): when DEMO_MODE=true the generate route
// must round-trip with ZERO Gemini calls. Placeholder gradients live in
// public/demo until phase 6 swaps in the best real generations.

export const demoBreakdown = [
  { label: "audience", detail: "Students, developers, and startup founders" },
  { label: "hook", detail: "Hands-on workshops and a startup showcase" },
  { label: "logistics", detail: "Free entry for students, lunch provided, on-site parking" },
];

export const demoVariants = [
  {
    caption:
      "The future builds itself? Not quite — come build it with us. One day, 12 speakers, 4 hands-on workshops.",
    hashtags: ["#TechEvent", "#AI", "#Robotics", "#Innovation"],
  },
  {
    caption:
      "Students attend FREE. Lunch is on us. The only thing you need to bring is curiosity.",
    hashtags: ["#StudentLife", "#FreeEvent", "#TechCommunity"],
  },
  {
    caption:
      "12 speakers. 4 workshops. 1 startup showcase. 0 reasons to miss it.",
    hashtags: ["#Startup", "#TechSummit", "#Networking"],
  },
];

// Served from the public Supabase bucket so Buffer can fetch them by URL
// (/rules #9) — localhost URLs would fail asset fetch. The same PNGs also
// live in public/demo as a local reserve.
export function demoImageUrl(variantIndex: number): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return `${base}/storage/v1/object/public/posts/demo/demo-${variantIndex}.png`;
}
