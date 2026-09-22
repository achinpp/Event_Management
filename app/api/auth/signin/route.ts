import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = signinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const db = supabaseAdmin();

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || "Invalid credentials" },
        { status: 400 }
      );
    }

    const res = NextResponse.json({
      message: "Signed in successfully",
      user: data.user,
    });

    // Store the access token in a secure HttpOnly cookie
    res.cookies.set("ep_session", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") || false,
      sameSite: "lax",
      path: "/",
      maxAge: data.session.expires_in,
    });

    return res;
  } catch (err: any) {
    console.error("Signin API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during signin" },
      { status: 500 }
    );
  }
}
