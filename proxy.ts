import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const user = await getSessionUser(req);
  if (user) {
    return NextResponse.next();
  }

  // Redirect to the login page if the user is not authenticated
  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};

