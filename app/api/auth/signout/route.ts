import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ message: "Signed out successfully" });
  res.cookies.set("ep_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
