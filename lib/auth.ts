import { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabase";

export async function getSessionUser(req: NextRequest | Request) {
  let token: string | undefined;

  if (req instanceof NextRequest) {
    token = req.cookies.get("ep_session")?.value;
  } else {
    // Parse cookie header manually for standard Request objects (like in standard Next.js route handlers)
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/ep_session=([^;]+)/);
    token = match ? match[1] : undefined;
  }

  if (!token) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error("Auth helper error:", err);
    return null;
  }
}
