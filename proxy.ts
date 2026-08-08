import { NextRequest, NextResponse } from "next/server";

const COOKIE = "ep_admin";

// Password-gate everything under /admin. The cookie is set here in the
// proxy after a correct password is submitted via the inline form below.
export function proxy(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("ADMIN_PASSWORD is not set in .env.local", {
      status: 500,
    });
  }

  if (req.cookies.get(COOKIE)?.value === password) {
    return NextResponse.next();
  }

  // Login form posts back to the same URL with the password as a form field.
  if (req.method === "POST") {
    return req.formData().then((form) => {
      if (form.get("password") === password) {
        const res = NextResponse.redirect(req.nextUrl, 303);
        res.cookies.set(COOKIE, password, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return res;
      }
      return loginPage(true);
    });
  }

  return loginPage(false);
}

function loginPage(failed: boolean) {
  return new NextResponse(
    `<!doctype html><html><head><title>EventPilot admin</title>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;background:#0a0a0a;color:#ededed}
form{display:flex;flex-direction:column;gap:12px;width:280px}
input,button{padding:10px 12px;border-radius:8px;border:1px solid #333;background:#171717;color:#ededed;font-size:14px}
button{background:#2563eb;border-color:#2563eb;cursor:pointer;font-weight:600}
.err{color:#f87171;font-size:13px;margin:0}</style></head>
<body><form method="POST"><h1 style="font-size:18px;margin:0">EventPilot admin</h1>
${failed ? '<p class="err">Wrong password.</p>' : ""}
<input type="password" name="password" placeholder="Admin password" autofocus />
<button type="submit">Sign in</button></form></body></html>`,
    { status: failed ? 401 : 200, headers: { "content-type": "text/html" } }
  );
}

export const config = {
  matcher: ["/admin/:path*"],
};
