export type ItemKind = "login" | "note" | "card" | "document" | "identity";

export interface CustomField {
  id: string;
  label: string;
  value: string;
  isMasked?: boolean;
}

export interface LoginPayload {
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  customFields?: CustomField[];
  recoveryCodes?: string[];
  tags?: string[];
  isFavorite?: boolean;
}

export interface NotePayload {
  title: string;
  content: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface CardPayload {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  pin?: string;
  notes?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface DocumentPayload {
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileObjectId: string;
  thumbnailObjectId?: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface IdentityPayload {
  fullName: string;
  idNumber: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  notes?: string;
  fields?: CustomField[];
  tags?: string[];
  isFavorite?: boolean;
}

export type DecryptedPayload =
  | { kind: "login"; data: LoginPayload }
  | { kind: "note"; data: NotePayload }
  | { kind: "card"; data: CardPayload }
  | { kind: "document"; data: DocumentPayload }
  | { kind: "identity"; data: IdentityPayload };

export interface ItemEncryptionEnvelope {
  cryptoVersion: 1;
  vaultId: string;
  itemId: string;
  kind: ItemKind;
  revision: number;
  alg: "AES-256-GCM";
  nonce: string; // Base64
  ciphertext: string; // Base64
}

export interface KdfParameters {
  m: number; // Memory in KiB (e.g. 65536 = 64MB)
  t: number; // Iterations
  p: number; // Parallelism
}

export interface VaultKeyEnvelope {
  vaultId: string;
  cryptoVersion: number;
  wrappedRootKey: string; // Base64
  wrapNonce: string; // Base64
  kdfSalt: string; // Base64
  kdfParams: KdfParameters;
  recoveryWrappedKey?: string | null;
  recoveryMetadata?: Record<string, unknown> | null;
}

export interface DecryptedVaultItem {
  id: string;
  vaultId: string;
  kind: ItemKind;
  revision: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  payload: DecryptedPayload["data"];
}

export interface FileChunkManifest {
  fileId: string;
  originalFileName: string;
  mimeType: string;
  totalBytes: number;
  chunkSize: number;
  chunkCount: number;
  chunks: Array<{
    index: number;
    nonce: string;
    byteLength: number;
    checksumSha256: string;
  }>;
}

