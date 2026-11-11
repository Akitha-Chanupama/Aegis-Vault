import {
  VaultKeyEnvelope,
  ItemEncryptionEnvelope,
  AegisError,
  AegisErrorCode,
} from "@aegis/shared";

// In-Memory Vault Store for API Route Handlers (or wraps Prisma DB)
interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
}

interface StoredItemRecord {
  envelope: ItemEncryptionEnvelope;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredSyncEvent {
  seq: number;
  vaultId: string;
  itemId: string;
  revision: number;
  eventType: "CREATE" | "UPDATE" | "DELETE" | "RESTORE";
  createdAt: string;
}

class ServerVaultStore {
  private users = new Map<string, StoredUser>();
  private keyEnvelopes = new Map<string, VaultKeyEnvelope>(); // vaultId -> envelope
  private items = new Map<string, StoredItemRecord>(); // `${vaultId}:${itemId}` -> record
  private syncEvents: StoredSyncEvent[] = [];
  private currentSeq = 1;

  constructor() {
    // Seed default synthetic user and vault for development
    const defaultUserId = "00000000-0000-4000-8000-000000000001";
    const defaultVaultId = "00000000-0000-4000-8000-000000000002";
    this.users.set(defaultUserId, {
      id: defaultUserId,
      email: "owner@aegisvault.local",
      passwordHash: "synthetic_hashed_login_password_for_dev_only",
    });
  }

  // Vault Key Envelope Operations
  public getKeyEnvelope(vaultId: string): VaultKeyEnvelope | null {
    return this.keyEnvelopes.get(vaultId) || null;
  }

  public initializeVault(vaultId: string, envelope: VaultKeyEnvelope): void {
    if (this.keyEnvelopes.has(vaultId)) {
      throw new AegisError(
        AegisErrorCode.VAULT_ALREADY_INITIALIZED,
        "Vault has already been initialized.",
        400
      );
    }
    this.keyEnvelopes.set(vaultId, envelope);
  }

  public rotateKeyEnvelope(vaultId: string, envelope: VaultKeyEnvelope): void {
    if (!this.keyEnvelopes.has(vaultId)) {
      throw new AegisError(
        AegisErrorCode.NOT_FOUND,
        "Vault not found.",
        404
      );
    }
    this.keyEnvelopes.set(vaultId, envelope);
  }

  // Ciphertext Item Operations
  public getItems(vaultId: string, includeDeleted = false): ItemEncryptionEnvelope[] {
    const results: ItemEncryptionEnvelope[] = [];
    for (const [key, record] of this.items.entries()) {
      if (key.startsWith(`${vaultId}:`)) {
        if (!record.isDeleted || includeDeleted) {
          results.push(record.envelope);
        }
      }
    }
    return results;
  }

  public getItem(vaultId: string, itemId: string): ItemEncryptionEnvelope {
    const record = this.items.get(`${vaultId}:${itemId}`);
    if (!record || record.isDeleted) {
      throw new AegisError(AegisErrorCode.NOT_FOUND, "Item not found.", 404);
    }
    return record.envelope;
  }

  public createItem(envelope: ItemEncryptionEnvelope): void {
    const key = `${envelope.vaultId}:${envelope.itemId}`;
    if (this.items.has(key)) {
      throw new AegisError(
        AegisErrorCode.INVALID_ENVELOPE,
        "Item with this ID already exists.",
        400
      );
    }

    this.items.set(key, {
      envelope,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.recordSyncEvent(envelope.vaultId, envelope.itemId, envelope.revision, "CREATE");
  }

  public updateItem(envelope: ItemEncryptionEnvelope, expectedRevision: number): void {
    const key = `${envelope.vaultId}:${envelope.itemId}`;
    const record = this.items.get(key);
    if (!record) {
      throw new AegisError(AegisErrorCode.NOT_FOUND, "Item not found.", 404);
    }

    if (record.envelope.revision !== expectedRevision) {
      throw new AegisError(
        AegisErrorCode.REVISION_CONFLICT,
        `Revision conflict: expected revision ${expectedRevision}, but current revision is ${record.envelope.revision}.`,
        409,
        { currentRevision: record.envelope.revision }
      );
    }

    this.items.set(key, {
      envelope,
      isDeleted: false,
      createdAt: record.createdAt,
      updatedAt: new Date().toISOString(),
    });

    this.recordSyncEvent(envelope.vaultId, envelope.itemId, envelope.revision, "UPDATE");
  }

  public deleteItem(vaultId: string, itemId: string): void {
    const key = `${vaultId}:${itemId}`;
    const record = this.items.get(key);
    if (!record) {
      throw new AegisError(AegisErrorCode.NOT_FOUND, "Item not found.", 404);
    }

    const nextRevision = record.envelope.revision + 1;
    this.items.set(key, {
      ...record,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
      envelope: {
        ...record.envelope,
        revision: nextRevision,
      },
    });

    this.recordSyncEvent(vaultId, itemId, nextRevision, "DELETE");
  }

  // Sync Delta Engine
  private recordSyncEvent(
    vaultId: string,
    itemId: string,
    revision: number,
    eventType: "CREATE" | "UPDATE" | "DELETE" | "RESTORE"
  ) {
    this.syncEvents.push({
      seq: this.currentSeq++,
      vaultId,
      itemId,
      revision,
      eventType,
      createdAt: new Date().toISOString(),
    });
  }

  public getSyncDeltas(vaultId: string, sinceSeq: number, limit = 50) {
    const events = this.syncEvents
      .filter((e) => e.vaultId === vaultId && e.seq > sinceSeq)
      .slice(0, limit);

    const updatedEnvelopes: ItemEncryptionEnvelope[] = [];
    for (const ev of events) {
      const rec = this.items.get(`${vaultId}:${ev.itemId}`);
      if (rec) {
        updatedEnvelopes.push(rec.envelope);
      }
    }

    const latestSeq = events.length > 0 ? events[events.length - 1].seq : sinceSeq;

    return {
      events,
      envelopes: updatedEnvelopes,
      latestSeq,
    };
  }
}

// Global server instance
declare global {
  var aegisServerStore: ServerVaultStore | undefined;
}

export const serverVaultStore = global.aegisServerStore ?? new ServerVaultStore();

if (process.env.NODE_ENV !== "production") {
  global.aegisServerStore = serverVaultStore;
}
