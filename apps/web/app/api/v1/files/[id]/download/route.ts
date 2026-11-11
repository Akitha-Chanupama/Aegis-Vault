import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";
import { AegisError } from "@aegis/shared";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const downloadInfo = serverVaultStore.downloadFile(DEFAULT_VAULT_ID, id);

    return NextResponse.json(downloadInfo, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    if (err instanceof AegisError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "File not found" } },
      { status: 404 }
    );
  }
}
