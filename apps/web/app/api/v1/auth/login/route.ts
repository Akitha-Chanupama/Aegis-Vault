import { NextRequest, NextResponse } from "next/server";
import { LoginRequestSchema } from "@aegis/shared";
import { authRateLimiter } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const { allowed, resetMs } = authRateLimiter.isAllowed(ip);

  if (!allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Too many login attempts. Please wait ${Math.ceil(resetMs / 1000)} seconds.`,
        },
      },
      { status: 429, headers: { "Retry-After": Math.ceil(resetMs / 1000).toString() } }
    );
  }

  try {
    const body = await req.json();
    const { email, password } = LoginRequestSchema.parse(body);

    // Synthetic login validation (Zero-knowledge: does not involve vault keys)
    const response = NextResponse.json({
      success: true,
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        email,
      },
    });

    response.cookies.set("aegis_session", "synthetic_valid_session_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
      { status: 401 }
    );
  }
}

