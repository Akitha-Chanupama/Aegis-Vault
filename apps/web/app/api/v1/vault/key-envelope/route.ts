import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

export async function GET(req: NextRequest) {
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

