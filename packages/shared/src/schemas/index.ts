import { z } from "zod";

export const ItemKindSchema = z.enum(["login", "note", "card", "document", "identity"]);

export const CustomFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(100),
  value: z.string().max(2000),
  isMasked: z.boolean().optional(),
});

export const LoginPayloadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  username: z.string().max(256),
  password: z.string().max(1024),
  url: z.string().url().max(2048).optional().or(z.literal("")),
  notes: z.string().max(10000).optional(),
  customFields: z.array(CustomFieldSchema).optional(),
  recoveryCodes: z.array(z.string().max(100)).optional(),
  tags: z.array(z.string().max(50)).optional(),
  isFavorite: z.boolean().optional(),
});

export const NotePayloadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().max(500000), // Max 500KB note text
  tags: z.array(z.string().max(50)).optional(),
  isFavorite: z.boolean().optional(),
});

export const CardPayloadSchema = z.object({
  cardholderName: z.string().min(1).max(100),
  cardNumber: z.string().regex(/^[0-9\s-]{12,24}$/, "Invalid card number format"),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "MM format"),
  expiryYear: z.string().regex(/^\d{2,4}$/, "YY or YYYY format"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3-4 digits"),
  pin: z.string().max(12).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).optional(),
  isFavorite: z.boolean().optional(),
});

export const DocumentPayloadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100),
  fileSize: z.number().int().nonnegative(),
  fileObjectId: z.string().uuid(),
  thumbnailObjectId: z.string().uuid().optional(),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).optional(),
  isFavorite: z.boolean().optional(),
});

export const IdentityPayloadSchema = z.object({
  fullName: z.string().min(1).max(200),
  idNumber: z.string().min(1).max(100),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  issuingAuthority: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  fields: z.array(CustomFieldSchema).optional(),
  tags: z.array(z.string().max(50)).optional(),
  isFavorite: z.boolean().optional(),
});

export const ItemEncryptionEnvelopeSchema = z.object({
  cryptoVersion: z.literal(1),
  vaultId: z.string().uuid(),
  itemId: z.string().uuid(),
  kind: ItemKindSchema,
  revision: z.number().int().positive(),
  alg: z.literal("AES-256-GCM"),
  nonce: z.string().regex(/^[A-Za-z0-9+/=]+$/, "Invalid Base64 nonce"),
  ciphertext: z.string().regex(/^[A-Za-z0-9+/=]+$/, "Invalid Base64 ciphertext"),
});

export const KdfParametersSchema = z.object({
  m: z.number().int().min(16384).max(262144), // 16MB to 256MB
  t: z.number().int().min(1).max(10),
  p: z.number().int().min(1).max(16),
});

export const VaultInitRequestSchema = z.object({
  wrappedRootKey: z.string().regex(/^[A-Za-z0-9+/=]+$/),
  wrapNonce: z.string().regex(/^[A-Za-z0-9+/=]+$/),
  kdfSalt: z.string().regex(/^[A-Za-z0-9+/=]+$/),
  kdfParams: KdfParametersSchema,
  recoveryWrappedKey: z.string().regex(/^[A-Za-z0-9+/=]+$/).optional(),
  recoveryMetadata: z.record(z.unknown()).optional(),
});

export const SignupRequestSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(10, "Password must be at least 10 characters").max(128),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
