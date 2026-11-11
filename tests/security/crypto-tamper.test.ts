import { test, describe } from "node:test";
import assert from "node:assert";
import {
  generateVaultRootKey,
  generateKdfSalt,
  deriveKeyArgon2id,
  importRawKey,
  exportRawKey,
  wrapVaultRootKey,
  unwrapVaultRootKey,
  encryptItemEnvelope,
  decryptItemEnvelope,
  deriveFileKey,
  encryptChunk,
  decryptChunk,
  encryptManifest,
  decryptManifest,
  base64ToUint8Array,
  uint8ArrayToBase64,
} from "@aegis/crypto";
import type { LoginPayload, NotePayload } from "@aegis/shared";

describe("Aegis Security & Tampering Resistance Test Suite", () => {
  const syntheticPassphrase = "correct horse battery staple 2026!";
  const testUserId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const testVaultId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const testItemId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  test("Flipped byte in ciphertext causes AES-GCM authentication failure", async () => {
    const vrk = await generateVaultRootKey();
    const payload: NotePayload = {
      title: "Secret Mission",
      content: "Classified operations notes.",
    };

    const envelope = await encryptItemEnvelope(vrk, testVaultId, testItemId, "note", 1, payload);

    // Decode ciphertext, flip single byte, re-encode
    const ciphertextBytes = base64ToUint8Array(envelope.ciphertext);
    ciphertextBytes[5] ^= 0xff; // Flip bits in middle of ciphertext
    const tamperedEnvelope = {
      ...envelope,
      ciphertext: uint8ArrayToBase64(ciphertextBytes),
    };

    await assert.rejects(
      async () => {
        await decryptItemEnvelope(vrk, tamperedEnvelope);
      },
      /operation failed|authentication failed/i,
      "Decryption of corrupted ciphertext must be rejected"
    );
  });

  test("Truncated authentication tag causes immediate failure", async () => {
    const vrk = await generateVaultRootKey();
    const payload: LoginPayload = {
      name: "Test Bank",
      username: "user",
      password: "password123",
    };

    const envelope = await encryptItemEnvelope(vrk, testVaultId, testItemId, "login", 1, payload);
    const ciphertextBytes = base64ToUint8Array(envelope.ciphertext);

    // Truncate last 8 bytes (part of the 16-byte GCM auth tag)
    const truncatedBytes = ciphertextBytes.slice(0, ciphertextBytes.length - 8);
    const tamperedEnvelope = {
      ...envelope,
      ciphertext: uint8ArrayToBase64(truncatedBytes),
    };

    await assert.rejects(
      async () => {
        await decryptItemEnvelope(vrk, tamperedEnvelope);
      },
      /operation failed|authentication failed/i,
      "Decryption of truncated auth tag must be rejected"
    );
  });

  test("Cross-Tenant transplant attack: Swapped user ID in wrapped key envelope fails", async () => {
    const vrk = await generateVaultRootKey();
    const salt = generateKdfSalt();
    const kekBytes = await deriveKeyArgon2id(syntheticPassphrase, salt, { m: 16384, t: 1, p: 1 });
    const kek = await importRawKey(kekBytes);

    const { wrappedRootKey, wrapNonce } = await wrapVaultRootKey(vrk, kek, testVaultId, testUserId);

    // Attacker tries to unwrap Victim's root key under Attacker's user ID
    const attackerUserId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    await assert.rejects(
      async () => {
        await unwrapVaultRootKey(wrappedRootKey, wrapNonce, kek, testVaultId, attackerUserId);
      },
      /operation failed|authentication failed/i,
      "Unwrapping with foreign user ID must fail"
    );
  });

  test("File Chunk Reordering Attack: Chunks 0 and 1 swapped are rejected by AAD", async () => {
    const vrk = await generateVaultRootKey();
    const fileId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const fileKey = await deriveFileKey(vrk, fileId);

    const chunk0Data = new Uint8Array([10, 20, 30, 40]);
    const chunk1Data = new Uint8Array([50, 60, 70, 80]);

    const chunk0 = await encryptChunk(fileKey, chunk0Data, fileId, 0, 2);
    const chunk1 = await encryptChunk(fileKey, chunk1Data, fileId, 1, 2);

    // Attempting to decrypt chunk1 ciphertext with chunkIndex 0 must fail
    await assert.rejects(
      async () => {
        await decryptChunk(fileKey, chunk1.ciphertext, chunk1.nonce, fileId, 0, 2);
      },
      /operation failed|authentication failed/i,
      "Chunk index mismatch in AAD must fail authentication"
    );

    // Attempting to decrypt chunk0 with wrong totalChunks must fail
    await assert.rejects(
      async () => {
        await decryptChunk(fileKey, chunk0.ciphertext, chunk0.nonce, fileId, 0, 5);
      },
      /operation failed|authentication failed/i,
      "Total chunks mismatch in AAD must fail authentication"
    );
  });

  test("File Manifest tampering fails decryption", async () => {
    const vrk = await generateVaultRootKey();
    const fileId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const fileKey = await deriveFileKey(vrk, fileId);

    const originalManifest = {
      fileId,
      originalFileName: "tax_returns_2025.pdf",
      mimeType: "application/pdf",
      totalBytes: 2048,
      chunkSize: 1024,
      chunkCount: 2,
      chunks: [
        { index: 0, nonce: "n0", byteLength: 1024, checksumSha256: "hash0" },
        { index: 1, nonce: "n1", byteLength: 1024, checksumSha256: "hash1" },
      ],
    };

    const { encryptedManifest, manifestNonce } = await encryptManifest(fileKey, fileId, originalManifest);

    // Try decrypting with wrong fileId (cross-file transplant)
    await assert.rejects(
      async () => {
        await decryptManifest(fileKey, "different-file-id", encryptedManifest, manifestNonce);
      },
      /operation failed|authentication failed/i,
      "Manifest AAD with wrong file ID must fail"
    );
  });
});
