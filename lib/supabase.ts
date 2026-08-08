import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only service-role client. Never import this from a client component.
// RLS is on with zero policies, so this key is the only way to reach the DB.
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin() must never run in the browser");
  }
  if (!cached) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
      );
    }
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
