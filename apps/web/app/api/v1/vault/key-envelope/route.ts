import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";
import { keyRateLimiter } from "@/lib/rate-limiter";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const { allowed, resetMs } = keyRateLimiter.isAllowed(ip);

  if (!allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Too many key requests. Please retry in ${Math.ceil(resetMs / 1000)} seconds.`,
        },
      },
      { status: 429, headers: { "Retry-After": Math.ceil(resetMs / 1000).toString() } }
    );
  }

  const envelope = serverVaultStore.getKeyEnvelope(DEFAULT_VAULT_ID);

  if (!envelope) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Vault has not been initialized." } },
      { status: 404 }
    );
  }

  return NextResponse.json(envelope, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

