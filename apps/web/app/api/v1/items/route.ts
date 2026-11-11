import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";
import { ItemEncryptionEnvelopeSchema, AegisError } from "@aegis/shared";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

export async function GET(req: NextRequest) {
  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const envelopes = serverVaultStore.getItems(DEFAULT_VAULT_ID, includeDeleted);

  return NextResponse.json(
    { items: envelopes },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const envelope = ItemEncryptionEnvelopeSchema.parse(body);

    serverVaultStore.createItem(envelope);

    return NextResponse.json({ success: true, itemId: envelope.itemId }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AegisError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: err instanceof Error ? err.message : "Validation error" } },
      { status: 400 }
    );
  }
}
