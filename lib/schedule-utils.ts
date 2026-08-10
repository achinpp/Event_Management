/**
 * Schedule Utilities
 *
 * Parses AI-generated `publishWindow` strings (e.g. "2 weeks before",
 * "Event day", "1 day after") into concrete ISO datetimes given the
 * event's `starts_at` date.
 *
 * Platform-aware default posting times:
 *   LinkedIn → 09:00,  Instagram → 12:00,  Twitter/X → 17:00
 */

// ── Platform-specific optimal posting hours ───────────────────────────────

const PLATFORM_HOURS: Record<string, number> = {
  linkedin: 9,   // 9 AM
  instagram: 12, // 12 PM
  twitter: 17,   // 5 PM
  x: 17,         // 5 PM (alias)
  facebook: 10,  // 10 AM
  tiktok: 19,    // 7 PM
};

const DEFAULT_HOUR = 10; // fallback if platform not matched

/**
 * Returns the optimal posting hour (0–23) for a given platform name.
 */
export function platformPostingHour(platform?: string | null): number {
  if (!platform) return DEFAULT_HOUR;
  const key = platform.toLowerCase().trim();
  for (const [name, hour] of Object.entries(PLATFORM_HOURS)) {
    if (key.includes(name)) return hour;
  }
  return DEFAULT_HOUR;
}

// ── Publish Window Parser ─────────────────────────────────────────────────

/**
 * Parses a relative publishWindow string and resolves it to a concrete
 * ISO 8601 datetime string.
 *
 * Supported formats:
 *   "X weeks before"  / "X week before"
 *   "X days before"   / "X day before"
 *   "Event day"       / "Day of event"
 *   "X days after"    / "X day after"
 *   "X weeks after"   / "X week after"
 *
 * @param startsAt  - event start date (ISO string or null)
 * @param window    - the AI-generated publishWindow string
 * @param platform  - platform name for time-of-day selection
 * @returns ISO 8601 datetime string or null if unparseable
 */
export function resolvePublishDate(
  startsAt: string | null | undefined,
  window: string,
  platform?: string | null,
): string | null {
  // If no event date, use "today" as the anchor
  const anchor = startsAt ? new Date(startsAt) : new Date();
  if (isNaN(anchor.getTime())) {
    console.warn(`[Schedule Utils] Invalid starts_at: "${startsAt}", using today`);
    return null;
  }

  const hour = platformPostingHour(platform);
  const normalized = window.toLowerCase().trim();

  let offsetDays = 0;
  let direction: "before" | "after" | "same" = "same";

  // Try: "X weeks before/after"
  const weeksMatch = normalized.match(/(\d+)\s*weeks?\s*(before|after)/i);
  if (weeksMatch) {
    offsetDays = parseInt(weeksMatch[1], 10) * 7;
    direction = weeksMatch[2].toLowerCase() as "before" | "after";
  }

  // Try: "X days before/after"
  if (!weeksMatch) {
    const daysMatch = normalized.match(/(\d+)\s*days?\s*(before|after)/i);
    if (daysMatch) {
      offsetDays = parseInt(daysMatch[1], 10);
      direction = daysMatch[2].toLowerCase() as "before" | "after";
    }
  }

  // Try: "event day" / "day of event" / "on event day"
  if (!weeksMatch && offsetDays === 0) {
    if (/event\s*day|day\s*of\s*event|on\s*the\s*day/i.test(normalized)) {
      direction = "same";
      offsetDays = 0;
    }
  }

  // Calculate the resolved date
  const resolved = new Date(anchor);
  if (direction === "before") {
    resolved.setDate(resolved.getDate() - offsetDays);
  } else if (direction === "after") {
    resolved.setDate(resolved.getDate() + offsetDays);
  }
  // else: same day

  // Set the posting hour
  resolved.setHours(hour, 0, 0, 0);

  console.log(
    `[Schedule Utils] "${window}" (${platform ?? "default"}) → ${resolved.toISOString()} (${direction === "same" ? "event day" : `${offsetDays}d ${direction}`}, ${hour}:00)`
  );

  return resolved.toISOString();
}

/**
 * Formats an ISO string into a `datetime-local` input value (YYYY-MM-DDTHH:MM).
 */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
