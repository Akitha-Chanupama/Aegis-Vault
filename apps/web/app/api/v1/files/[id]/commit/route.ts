import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";
import { AegisError } from "@aegis/shared";
import { z } from "zod";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

const CommitFileSchema = z.object({
  encryptedManifest: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { encryptedManifest } = CommitFileSchema.parse(body);

    serverVaultStore.commitFileUpload(DEFAULT_VAULT_ID, id, encryptedManifest);

    return NextResponse.json({ success: true, fileId: id });
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
