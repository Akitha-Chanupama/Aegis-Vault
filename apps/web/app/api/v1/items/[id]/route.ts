import { NextRequest, NextResponse } from "next/server";
import { serverVaultStore } from "@/lib/server-vault-store";
import { ItemEncryptionEnvelopeSchema, AegisError } from "@aegis/shared";

const DEFAULT_VAULT_ID = "00000000-0000-4000-8000-000000000002";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = serverVaultStore.getItem(DEFAULT_VAULT_ID, id);
    return NextResponse.json(item, {
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
      { error: { code: "NOT_FOUND", message: "Item not found" } },
      { status: 404 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const expectedRevision = Number(req.headers.get("if-match") || body.expectedRevision);

    if (!expectedRevision) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "expectedRevision is required for concurrency check." } },
        { status: 400 }
      );
    }

    const envelope = ItemEncryptionEnvelopeSchema.parse(body);
    if (envelope.itemId !== id) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Item ID mismatch." } },
        { status: 400 }
      );
    }

    serverVaultStore.updateItem(envelope, expectedRevision);

    return NextResponse.json({ success: true, revision: envelope.revision });
  } catch (err: unknown) {
    if (err instanceof AegisError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message, details: err.details } },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: err instanceof Error ? err.message : "Validation error" } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    serverVaultStore.deleteItem(DEFAULT_VAULT_ID, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AegisError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Item not found" } },
      { status: 404 }
    );
  }
}
