import { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabase";

export async function getSessionUser(req: NextRequest | Request) {
  let token: string | undefined;

  // Check if req has cookies object (e.g. NextRequest or extended Request)
  if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
    token = (req as any).cookies.get("ep_session")?.value;
  }

  // Fallback to manual parsing from cookie header if token not found via cookies API
  if (!token && req.headers) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)ep_session=([^;]+)/);
    token = match ? decodeURIComponent(match[1].trim()) : undefined;
  }

  if (!token) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !user) {
      if (error) console.warn("Supabase auth.getUser error:", error.message);
      return null;
    }
    return user;
  } catch (err) {
    console.error("Auth helper exception:", err);
    return null;
  }
}
