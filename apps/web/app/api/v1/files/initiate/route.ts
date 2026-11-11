import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";
import { AegisError } from "@aegis/shared";
import { z } from "zod";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

const InitiateFileSchema = z.object({
  itemId: z.string().uuid(),
  chunkCount: z.number().int().positive().max(1000),
  ciphertextBytes: z.number().int().positive().max(100 * 1024 * 1024), // 100 MB max file
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, chunkCount, ciphertextBytes } = InitiateFileSchema.parse(body);

    const result = serverVaultStore.initiateFileUpload(
      DEFAULT_VAULT_ID,
      itemId,
      chunkCount,
      ciphertextBytes
    );

    return NextResponse.json(result, { status: 201 });
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
