import {
  type VaultKeyEnvelope,
  type ItemEncryptionEnvelope,
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

interface StoredFileObject {
  id: string;
  vaultId: string;
  itemId: string;
  storageKey: string;
  encryptedManifest: string;
  chunkCount: number;
  ciphertextBytes: number;
  status: "INITIATED" | "COMMITTED" | "DELETED";
  createdAt: string;
  updatedAt: string;
}

class ServerVaultStore {
  private users = new Map<string, StoredUser>();
  private keyEnvelopes = new Map<string, VaultKeyEnvelope>(); // vaultId -> envelope
  private items = new Map<string, StoredItemRecord>(); // `${vaultId}:${itemId}` -> record
  private files = new Map<string, StoredFileObject>(); // fileId -> file record
  private syncEvents: StoredSyncEvent[] = [];
  private currentSeq = 1;
  private readonly MAX_VAULT_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB Quota

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

  // Encrypted Blob Storage Operations
  public initiateFileUpload(
    vaultId: string,
    itemId: string,
    chunkCount: number,
    ciphertextBytes: number
  ): { fileId: string; storageKey: string; uploadUrls: string[] } {
    // 1. Quota Enforcement
    let currentUsage = 0;
    for (const file of this.files.values()) {
      if (file.vaultId === vaultId && file.status === "COMMITTED") {
        currentUsage += file.ciphertextBytes;
      }
    }

    if (currentUsage + ciphertextBytes > this.MAX_VAULT_QUOTA_BYTES) {
      throw new AegisError(
        AegisErrorCode.FILE_TOO_LARGE,
        `Storage quota exceeded. Used ${currentUsage} of ${this.MAX_VAULT_QUOTA_BYTES} bytes.`,
        413
      );
    }

    const fileId = crypto.randomUUID();
    const storageKey = crypto.randomUUID(); // Random opaque UUID key; NEVER user filename

    const uploadUrls: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      uploadUrls.push(`https://s3.local.aegis/upload/${storageKey}/chunk-${i}?token=${crypto.randomUUID()}`);
    }

    this.files.set(fileId, {
      id: fileId,
      vaultId,
      itemId,
      storageKey,
      encryptedManifest: "",
      chunkCount,
      ciphertextBytes,
      status: "INITIATED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { fileId, storageKey, uploadUrls };
  }

  public commitFileUpload(
    vaultId: string,
    fileId: string,
    encryptedManifest: string
  ): void {
    const file = this.files.get(fileId);
    if (!file || file.vaultId !== vaultId) {
      throw new AegisError(AegisErrorCode.NOT_FOUND, "File not found.", 404);
    }

    if (!encryptedManifest) {
      throw new AegisError(AegisErrorCode.INVALID_ENVELOPE, "Encrypted manifest is required.", 400);
    }

    file.encryptedManifest = encryptedManifest;
    file.status = "COMMITTED";
    file.updatedAt = new Date().toISOString();
  }

  public downloadFile(vaultId: string, fileId: string): { storageKey: string; chunkCount: number; encryptedManifest: string; downloadUrls: string[] } {
    const file = this.files.get(fileId);
    if (!file || file.vaultId !== vaultId || file.status !== "COMMITTED") {
      throw new AegisError(AegisErrorCode.NOT_FOUND, "File not found or not committed.", 404);
    }

    const downloadUrls: string[] = [];
    for (let i = 0; i < file.chunkCount; i++) {
      downloadUrls.push(`https://s3.local.aegis/download/${file.storageKey}/chunk-${i}?token=${crypto.randomUUID()}`);
    }

    return {
      storageKey: file.storageKey,
      chunkCount: file.chunkCount,
      encryptedManifest: file.encryptedManifest,
      downloadUrls,
    };
  }

  public deleteFile(vaultId: string, fileId: string): void {
    const file = this.files.get(fileId);
    if (!file || file.vaultId !== vaultId) {
      throw new AegisError(AegisErrorCode.NOT_FOUND, "File not found.", 404);
    }

    file.status = "DELETED";
    file.updatedAt = new Date().toISOString();
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

