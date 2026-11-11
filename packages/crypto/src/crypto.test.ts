import { test, describe } from "node:test";
import assert from "node:assert";
import {
  generateVaultRootKey,
  importRawKey,
  exportRawKey,
  generateKdfSalt,
  deriveKeyArgon2id,
  wrapVaultRootKey,
  unwrapVaultRootKey,
  encryptItemEnvelope,
  decryptItemEnvelope,
  generateRecoveryPhrase,
  deriveRecoveryKey,
  wrapWithRecoveryKey,
  unwrapWithRecoveryKey,
  deriveFileKey,
  encryptChunk,
  decryptChunk,
  encryptManifest,
  decryptManifest,
  DEFAULT_ARGON2_PARAMS,
} from "./index.js";
import { LoginPayload } from "@aegis/shared";

describe("Aegis Cryptographic Protocol Test Suite", () => {
  const syntheticPassphrase = "correct horse battery staple 2026!";
  const testUserId = "11111111-1111-4111-8111-111111111111";
  const testVaultId = "22222222-2222-4222-8222-222222222222";
  const testItemId = "33333333-3333-4333-8333-333333333333";

  test("Argon2id Key Derivation produces 32-byte KEK", async () => {
    const salt = generateKdfSalt();
    assert.strictEqual(salt.byteLength, 16);

    // Use fast params for unit test execution speed
    const testParams = { m: 16384, t: 1, p: 1 };
    const kekBytes = await deriveKeyArgon2id(syntheticPassphrase, salt, testParams);
    assert.strictEqual(kekBytes.byteLength, 32);

    // Deterministic output with identical inputs
    const kekBytes2 = await deriveKeyArgon2id(syntheticPassphrase, salt, testParams);
    assert.deepStrictEqual(kekBytes, kekBytes2);
  });

  test("Vault Root Key generation, wrapping, and unwrapping lifecycle", async () => {
    const vrk = await generateVaultRootKey();
    const rawVrkBefore = await exportRawKey(vrk);

    const salt = generateKdfSalt();
    const kekBytes = await deriveKeyArgon2id(syntheticPassphrase, salt, { m: 16384, t: 1, p: 1 });
    const kek = await importRawKey(kekBytes);

    const { wrappedRootKey, wrapNonce } = await wrapVaultRootKey(vrk, kek, testVaultId, testUserId);
    assert.ok(wrappedRootKey);
    assert.ok(wrapNonce);

    const unwrappedVrk = await unwrapVaultRootKey(wrappedRootKey, wrapNonce, kek, testVaultId, testUserId);
    const rawVrkAfter = await exportRawKey(unwrappedVrk);

    assert.deepStrictEqual(rawVrkBefore, rawVrkAfter);
  });

  test("Tampered Wrapped Key or Wrong AAD fails to unwrap", async () => {
    const vrk = await generateVaultRootKey();
    const salt = generateKdfSalt();
    const kekBytes = await deriveKeyArgon2id(syntheticPassphrase, salt, { m: 16384, t: 1, p: 1 });
    const kek = await importRawKey(kekBytes);

    const { wrappedRootKey, wrapNonce } = await wrapVaultRootKey(vrk, kek, testVaultId, testUserId);

    // Wrong user ID in AAD
    await assert.rejects(
      async () => {
        await unwrapVaultRootKey(wrappedRootKey, wrapNonce, kek, testVaultId, "wrong-user-id");
      },
      /operation failed|authentication failed/i
    );

    // Wrong vault ID in AAD
    await assert.rejects(
      async () => {
        await unwrapVaultRootKey(wrappedRootKey, wrapNonce, kek, "wrong-vault-id", testUserId);
      },
      /operation failed|authentication failed/i
    );
  });

  test("Item Envelope authenticated encryption & decryption roundtrip", async () => {
    const vrk = await generateVaultRootKey();
    const testLogin: LoginPayload = {
      name: "GitHub Synthetic Test Account",
      username: "developer@example.com",
      password: "SuperSecretPassword123!",
      url: "https://github.com",
      notes: "Development synthetic account only",
      isFavorite: true,
      tags: ["dev", "work"],
    };

    const envelope = await encryptItemEnvelope(vrk, testVaultId, testItemId, "login", 1, testLogin);
    assert.strictEqual(envelope.cryptoVersion, 1);
    assert.strictEqual(envelope.alg, "AES-256-GCM");
    assert.strictEqual(envelope.revision, 1);
    assert.strictEqual(envelope.itemId, testItemId);

    const decrypted = await decryptItemEnvelope(vrk, envelope) as LoginPayload;
    assert.deepStrictEqual(decrypted, testLogin);
  });

  test("Tampered Item Envelope AAD or Ciphertext is strictly rejected", async () => {
    const vrk = await generateVaultRootKey();
    const testLogin: LoginPayload = {
      name: "Bank Account Synthetic",
      username: "user",
      password: "pass",
    };

    const envelope = await encryptItemEnvelope(vrk, testVaultId, testItemId, "login", 1, testLogin);

    // 1. Swapped revision in envelope (replay of older revision)
    const tamperedRevision = { ...envelope, revision: 2 };
    await assert.rejects(
      async () => {
        await decryptItemEnvelope(vrk, tamperedRevision);
      },
      /operation failed|authentication failed/i
    );

    // 2. Swapped item ID (cross-item transplant attack)
    const tamperedItemId = { ...envelope, itemId: "44444444-4444-4444-8444-444444444444" };
    await assert.rejects(
      async () => {
        await decryptItemEnvelope(vrk, tamperedItemId);
      },
      /operation failed|authentication failed/i
    );

    // 3. Swapped vault ID (cross-vault transplant attack)
    const tamperedVaultId = { ...envelope, vaultId: "55555555-5555-4555-8555-555555555555" };
    await assert.rejects(
      async () => {
        await decryptItemEnvelope(vrk, tamperedVaultId);
      },
      /operation failed|authentication failed/i
    );
  });

  test("Consecutive encryptions produce distinct nonces (No Nonce Reuse)", async () => {
    const vrk = await generateVaultRootKey();
    const payload = { title: "Note", content: "Test" };

    const env1 = await encryptItemEnvelope(vrk, testVaultId, testItemId, "note", 1, payload);
    const env2 = await encryptItemEnvelope(vrk, testVaultId, testItemId, "note", 2, payload);

    assert.notStrictEqual(env1.nonce, env2.nonce);
    assert.notStrictEqual(env1.ciphertext, env2.ciphertext);
  });

  test("File Chunking & Manifest encryption integrity", async () => {
    const vrk = await generateVaultRootKey();
    const fileId = "file-99999999-9999-4999-8999-999999999999";
    const fileKey = await deriveFileKey(vrk, fileId);

    const chunkData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const { ciphertext, nonce } = await encryptChunk(fileKey, chunkData, fileId, 0, 1);

    const decryptedChunk = await decryptChunk(fileKey, ciphertext, nonce, fileId, 0, 1);
    assert.deepStrictEqual(decryptedChunk, chunkData);

    // Chunk reordering / wrong chunk index fails
    await assert.rejects(
      async () => {
        await decryptChunk(fileKey, ciphertext, nonce, fileId, 1, 1);
      },
      /operation failed|authentication failed/i
    );

    // Manifest encryption/decryption
    const manifest = {
      fileId,
      originalFileName: "passport.pdf",
      mimeType: "application/pdf",
      totalBytes: 10,
      chunkSize: 4096,
      chunkCount: 1,
      chunks: [
        {
          index: 0,
          nonce: "test-nonce",
          byteLength: 10,
          checksumSha256: "fake-sha",
        },
      ],
    };

    const { encryptedManifest, manifestNonce } = await encryptManifest(fileKey, fileId, manifest);
    const decryptedManifest = await decryptManifest(fileKey, fileId, encryptedManifest, manifestNonce);
    assert.deepStrictEqual(decryptedManifest, manifest);
  });

  test("Recovery Phrase generation, KEK derivation, and VRK recovery", async () => {
    const vrk = await generateVaultRootKey();
    const rawVrkBefore = await exportRawKey(vrk);

    const recoveryPhrase = generateRecoveryPhrase();
    assert.strictEqual(recoveryPhrase.split(" ").length, 24);

    const recoveryKek = await deriveRecoveryKey(recoveryPhrase);
    const { recoveryWrappedKey, recoveryNonce } = await wrapWithRecoveryKey(vrk, recoveryKek, testVaultId);

    // Restore using recovery phrase
    const recoveryKekRestore = await deriveRecoveryKey(recoveryPhrase);
    const restoredVrk = await unwrapWithRecoveryKey(recoveryWrappedKey, recoveryNonce, recoveryKekRestore, testVaultId);
    const rawVrkAfter = await exportRawKey(restoredVrk);

    assert.deepStrictEqual(rawVrkBefore, rawVrkAfter);
  });
});

