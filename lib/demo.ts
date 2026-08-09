// DEMO_MODE fixtures (/rules #10): when DEMO_MODE=true the generate route
// must round-trip with ZERO Gemini calls. Placeholder gradients live in
// public/demo until phase 6 swaps in the best real generations.

export const demoCampaignPlan = {
  campaignSummary:
    "A three-step social campaign to build excitement, open registration, and drive last-minute signups for the event.",
  targetAudience: "Tech professionals, AI researchers, software engineers, and tech startups in Colombo, Sri Lanka.",
  campaignGoals: [
    "Build buzz and drive 200+ student and professional registrations for the AI Summit.",
    "Position Colombo as an emerging hub for practical machine learning applications."
  ],
  keyMessages: [
    "Learn how generative AI is transforming real-world engineering.",
    "Network with Sri Lanka's leading technology startups."
  ],
  toneAndVoice: "Professional, exciting, and tech-forward, yet highly accessible.",
  platformStrategy: [
    {
      platform: "LinkedIn",
      rationale: "Main hub for professionals and sponsors.",
      postingFrequency: "2 posts per week",
      contentFocus: "Agenda, speaker bios, and networking value."
    },
    {
      platform: "Twitter",
      rationale: "Real-time updates and tech community engagement.",
      postingFrequency: "3 posts per week",
      contentFocus: "Countdown, key tech quotes, and live event snippets."
    }
  ],
  phases: [
    {
      name: "Awareness Phase",
      dateRange: "2 weeks before",
      objective: "Generate teaser interest and announce speakers.",
      postIndices: [0]
    },
    {
      name: "Registration Drive",
      dateRange: "10 days before",
      objective: "Convert interest to signups and highlight benefits.",
      postIndices: [1]
    },
    {
      name: "Urgency Phase",
      dateRange: "2 days before",
      objective: "Drive last-minute signups through countdown.",
      postIndices: [2]
    }
  ],
  postSequence: [
    {
      type: "coming_soon",
      label: "Coming Soon",
      goal: "Announce the event and build awareness.",
      publishWindow: "2 weeks before",
      platform: "LinkedIn",
      caption:
        "AI Summit Colombo is coming soon! Join expert speakers, hands-on workshops, and startup networking.",
      hashtags: ["#AISummit", "#Colombo", "#TechEvent"],
      imageBrief:
        "A bold announcement graphic with AI visuals, conference stage, and Colombo skyline.",
      callToAction: "Save the date"
    },
    {
      type: "registration_open",
      label: "Registration Open",
      goal: "Drive ticket signups and highlight event benefits.",
      publishWindow: "10 days before",
      platform: "LinkedIn",
      caption:
        "Registration is open for AI Summit Colombo. Save your seat for expert talks, workshops, and networking.",
      hashtags: ["#RegisterNow", "#AIConference", "#Networking"],
      imageBrief:
        "A vibrant signup graphic with people networking and workshop icons.",
      callToAction: "Register now"
    },
    {
      type: "registration_close",
      label: "Last Chance",
      goal: "Create urgency before registration closes.",
      publishWindow: "2 days before",
      platform: "Twitter",
      caption:
        "Last chance to register for AI Summit Colombo. Don’t miss practical sessions and startup demos.",
      hashtags: ["#LastChance", "#AISummit", "#FinalCall"],
      imageBrief:
        "A countdown-style urgent post with event highlights and a CTA.",
      callToAction: "Book tickets"
    },
  ],
  engagementStrategy: [
    "Share interactive polls about AI tools to build discussion.",
    "Directly tag speakers and sponsors in LinkedIn posts."
  ],
  contentCalendar: [
    {
      week: "Week 1 (2 weeks before)",
      activities: ["Publish announcement post", "Launch early registration form"]
    },
    {
      week: "Week 2 (1 week before)",
      activities: ["Post speaker bio spotlights", "Share workshop previews"]
    }
  ],
  kpiMetrics: [
    {
      metric: "Registrations",
      target: "200 seats filled",
      howToMeasure: "Supabase registrations table"
    },
    {
      metric: "Social Engagement Rate",
      target: "5% engagement rate across LinkedIn & Twitter",
      howToMeasure: "Platform native analytics"
    }
  ]
};

// Served from the public Supabase bucket so Buffer can fetch them by URL
// (/rules #9) — localhost URLs would fail asset fetch. The same PNGs also
// live in public/demo as a local reserve.
export function demoImageUrl(variantIndex: number): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return `${base}/storage/v1/object/public/posts/demo/demo-${variantIndex}.png`;
}
