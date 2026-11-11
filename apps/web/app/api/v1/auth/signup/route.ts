import { NextRequest, NextResponse } from "next/server";
import { SignupRequestSchema } from "@aegis/shared";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = SignupRequestSchema.parse(body);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          email,
        },
      },
      { status: 201 }
    );

    response.cookies.set("aegis_session", "synthetic_valid_session_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: err instanceof Error ? err.message : "Validation error" } },
      { status: 400 }
    );
  }
}

