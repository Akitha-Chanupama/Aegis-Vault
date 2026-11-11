# Aegis Vault - Schema & API Contract Specification

## 1. Relational Database Schema (Prisma / PostgreSQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id              String      @id @default(uuid())
  email           String      @unique
  passwordHash    String      // Hashed credentials for account login only
  emailVerifiedAt DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  vault           Vault?
  sessions        Session[]
  items           VaultItem[]

  @@map("users")
}

model Session {
  id          String   @id @default(uuid())
  userId      String
  tokenHash   String   @unique
  userAgent   String?
  ipAddress   String?
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model Vault {
  id                   String      @id @default(uuid())
  ownerUserId          String      @unique
  cryptoVersion        Int         @default(1)
  wrappedRootKey       String      // Base64-encoded AES-GCM wrapped VRK
  wrapNonce            String      // Base64-encoded 12-byte nonce
  kdfSalt              String      // Base64-encoded 16-byte random salt
  kdfParamsJson        String      // JSON string: { "m": 65536, "t": 3, "p": 4 }
  recoveryWrappedKey   String?     // Base64-encoded VRK wrapped under Recovery KEK
  recoveryMetadataJson String?     // Nonsecret parameters for recovery KDF
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  user                 User        @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  items                VaultItem[]
  files                FileObject[]
  syncEvents           SyncEvent[]

  @@map("vaults")
}

model VaultItem {
  id               String       @id @default(uuid())
  vaultId          String
  ownerUserId      String
  opaqueItemType   String       // "login" | "note" | "card" | "document" | "identity"
  encryptedPayload String       // Base64 ciphertext + GCM tag
  nonce            String       // Base64 12-byte nonce
  cryptoVersion    Int          @default(1)
  revision         Int          @default(1)
  isDeleted        Boolean      @default(false)
  serverUpdatedAt  DateTime     @updatedAt
  createdAt        DateTime     @default(now())

  vault            Vault        @relation(fields: [vaultId], references: [id], onDelete: Cascade)
  user             User         @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  files            FileObject[]

  @@unique([vaultId, id])
  @@index([vaultId, isDeleted, serverUpdatedAt])
  @@map("vault_items")
}

enum FileStatus {
  INITIATED
  COMMITTED
  DELETED
}

model FileObject {
  id                String     @id @default(uuid())
  vaultId           String
  itemId            String
  storageKey        String     @unique // Random UUID; never original filename
  encryptedManifest String     // Base64 ciphertext containing chunk count, original name, etc.
  chunkCount        Int
  ciphertextBytes   BigInt
  status            FileStatus @default(INITIATED)
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  vault             Vault      @relation(fields: [vaultId], references: [id], onDelete: Cascade)
  item              VaultItem  @relation(fields: [vaultId, itemId], references: [vaultId, id], onDelete: Cascade)

  @@index([vaultId, itemId])
  @@map("file_objects")
}

model SyncEvent {
  seq       BigInt   @id @default(autoincrement())
  vaultId   String
  itemId    String
  revision  Int
  eventType String   // "CREATE" | "UPDATE" | "DELETE" | "RESTORE"
  createdAt DateTime @default(now())

  vault     Vault    @relation(fields: [vaultId], references: [id], onDelete: Cascade)

  @@index([vaultId, seq])
  @@map("sync_events")
}
```

---

## 2. API Contract Specification (`/api/v1/*`)

All requests and responses use `application/json`. Errors return standard JSON:
```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "The item has been modified on another device.",
    "currentRevision": 4
  }
}
```

### 2.1 Authentication & Sessions
- `POST /api/v1/auth/signup`: Create owner account.
- `POST /api/v1/auth/login`: Authenticate and issue secure `HttpOnly` session cookie.
- `POST /api/v1/auth/logout`: Revoke active session cookie.
- `GET /api/v1/sessions`: List active device sessions with user-agent, IP, and timestamp.
- `DELETE /api/v1/sessions/:id`: Revoke a specific session.

### 2.2 Vault Initialization & Keys
- `GET /api/v1/vault/key-envelope`: Retrieve wrapped root key, KDF salt, and params. Returns `404` if uninitialized.
- `POST /api/v1/vault/initialize`: Submit initial wrapped key and KDF params. Allowed only once per account.
- `POST /api/v1/vault/key-envelope/rotate`: Re-wrap VRK under a new KEK (passphrase change).

### 2.3 Vault Items (Ciphertext CRUD)
- `GET /api/v1/items?cursor=&limit=&includeDeleted=`: Paginated list of item envelopes.
- `POST /api/v1/items`: Create item envelope (`revision = 1`).
- `GET /api/v1/items/:id`: Read specific item envelope.
- `PUT /api/v1/items/:id`: Update item envelope. Must provide `expectedRevision`. Returns `409 Conflict` if mismatched.
- `DELETE /api/v1/items/:id`: Soft-delete item (sets `isDeleted = true`, increments revision, records tombstone).
- `POST /api/v1/items/:id/restore`: Restores soft-deleted item.

### 2.4 Synchronization Cursor
- `GET /api/v1/sync?sinceSeq=&limit=50`: Returns all `sync_events` where `seq > sinceSeq` along with updated ciphertext envelopes. Enables rapid delta reconciliation without fetching full vault.

### 2.5 Encrypted Blob Files
- `POST /api/v1/files/initiate`: Reserve upload for $N$ chunks of $S$ bytes total. Checks user storage quota. Returns pre-signed S3 upload URLs for chunks.
- `POST /api/v1/files/:id/commit`: Confirms all chunks uploaded. Validates S3 chunk sizes and persists encrypted manifest.
- `GET /api/v1/files/:id/download`: Returns short-lived (15 minute) scoped pre-signed URLs for encrypted chunks.
- `DELETE /api/v1/files/:id`: Queues blob deletion from S3.
