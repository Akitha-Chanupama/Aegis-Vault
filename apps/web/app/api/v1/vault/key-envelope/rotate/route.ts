import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";
import { VaultInitRequestSchema, AegisError } from "@aegis/shared";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VaultInitRequestSchema.parse(body);

    serverVaultStore.rotateKeyEnvelope(DEFAULT_VAULT_ID, {
      vaultId: DEFAULT_VAULT_ID,
      cryptoVersion: 1,
      wrappedRootKey: parsed.wrappedRootKey,
      wrapNonce: parsed.wrapNonce,
      kdfSalt: parsed.kdfSalt,
      kdfParams: parsed.kdfParams,
      recoveryWrappedKey: parsed.recoveryWrappedKey,
      recoveryMetadata: parsed.recoveryMetadata,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AegisError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: err instanceof Error ? err.message : "Validation failed" } },
      { status: 400 }
    );
  }
}

