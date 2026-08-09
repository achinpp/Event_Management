import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const db = supabaseAdmin();

    // Create the user with email_confirm: true so it is immediately active
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Auto sign in user to create a session token
    const { data: signInData } = await db.auth.signInWithPassword({
      email,
      password,
    });

    const res = NextResponse.json(
      { message: "User registered successfully", user: data.user },
      { status: 201 }
    );

    if (signInData?.session) {
      res.cookies.set("ep_session", signInData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: signInData.session.expires_in,
      });
    }

    return res;
  } catch (err: any) {
    console.error("Signup API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during signup" },
      { status: 500 }
    );
  }
}
