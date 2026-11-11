import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

export async function GET(req: NextRequest) {
  const sinceSeq = Number(req.nextUrl.searchParams.get("since") || 0);
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") || 50));

  const deltas = serverVaultStore.getSyncDeltas(DEFAULT_VAULT_ID, sinceSeq, limit);

  return NextResponse.json(deltas, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
