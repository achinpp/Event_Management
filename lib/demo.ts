// DEMO_MODE fixtures (/rules #10): when DEMO_MODE=true the generate route
// must round-trip with ZERO Gemini calls. Placeholder gradients live in
// public/demo until phase 6 swaps in the best real generations.

export const demoCampaignPlan = {
  campaignSummary:
    "A three-step social campaign to build excitement, open registration, and drive last-minute signups for the event.",
  postSequence: [
    {
      type: "coming_soon",
      label: "Coming Soon",
      goal: "Announce the event and build awareness.",
      publishWindow: "2 weeks before",
      caption:
        "AI Summit Colombo is coming soon! Join expert speakers, hands-on workshops, and startup networking.",
      hashtags: ["#AISummit", "#Colombo", "#TechEvent"],
      imageBrief:
        "A bold announcement graphic with AI visuals, conference stage, and Colombo skyline.",
    },
    {
      type: "registration_open",
      label: "Registration Open",
      goal: "Drive ticket signups and highlight event benefits.",
      publishWindow: "10 days before",
      caption:
        "Registration is open for AI Summit Colombo. Save your seat for expert talks, workshops, and networking.",
      hashtags: ["#RegisterNow", "#AIConference", "#Networking"],
      imageBrief:
        "A vibrant signup graphic with people networking and workshop icons.",
    },
    {
      type: "registration_close",
      label: "Last Chance",
      goal: "Create urgency before registration closes.",
      publishWindow: "2 days before",
      caption:
        "Last chance to register for AI Summit Colombo. Don’t miss practical sessions and startup demos.",
      hashtags: ["#LastChance", "#AISummit", "#FinalCall"],
      imageBrief:
        "A countdown-style urgent post with event highlights and a CTA.",
    },
  ],
};

// Served from the public Supabase bucket so Buffer can fetch them by URL
// (/rules #9) — localhost URLs would fail asset fetch. The same PNGs also
// live in public/demo as a local reserve.
export function demoImageUrl(variantIndex: number): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return `${base}/storage/v1/object/public/posts/demo/demo-${variantIndex}.png`;
}
