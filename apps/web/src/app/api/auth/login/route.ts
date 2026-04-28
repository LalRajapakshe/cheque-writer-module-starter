import { NextRequest, NextResponse } from "next/server";
import { erpApiBaseUrl } from "@/lib/csharp-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${erpApiBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      return NextResponse.json({ success: false, error: payload.error || "Login failed" }, { status: 401 });
    }
    const next = NextResponse.json({ success: true, data: payload.data.user });
    next.cookies.set("cw_session", payload.data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return next;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ success: false, error: "Login service is not available." }, { status: 500 });
  }
}
