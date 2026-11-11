import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { serverVaultStore } from "../../apps/web/lib/server-vault-store.js";
import { AegisError, AegisErrorCode, type ItemEncryptionEnvelope } from "@aegis/shared";

describe("Aegis Server & Sync Concurrency Integration Test Suite", () => {
  const testVaultId = "00000000-0000-4000-8000-000000000002";
  const itemId = "88888888-8888-4888-8888-888888888888";

  const initialEnvelope: ItemEncryptionEnvelope = {
    cryptoVersion: 1,
    vaultId: testVaultId,
    itemId,
    kind: "login",
    revision: 1,
    alg: "AES-256-GCM",
    nonce: "testNonceBase64==",
    ciphertext: "testCiphertextBase64==",
  };

  test("1. Create initial item and verify storage", () => {
    serverVaultStore.createItem(initialEnvelope);
    const fetched = serverVaultStore.getItem(testVaultId, itemId);
    assert.strictEqual(fetched.revision, 1);
    assert.strictEqual(fetched.itemId, itemId);
  });

  test("2. Concurrency Conflict: Device B writes stale revision and gets 409", () => {
    // Device A updates revision 1 -> revision 2
    const deviceAUpdate: ItemEncryptionEnvelope = {
      ...initialEnvelope,
      revision: 2,
      ciphertext: "updatedByDeviceA==",
      nonce: "newNonceA==",
    };
    serverVaultStore.updateItem(deviceAUpdate, 1); // expectedRevision = 1

    const updated = serverVaultStore.getItem(testVaultId, itemId);
    assert.strictEqual(updated.revision, 2);

    // Device B concurrently attempts update with stale expectedRevision = 1
    const deviceBUpdate: ItemEncryptionEnvelope = {
      ...initialEnvelope,
      revision: 2,
      ciphertext: "conflictingDeviceB==",
      nonce: "newNonceB==",
    };

    assert.throws(
      () => {
        serverVaultStore.updateItem(deviceBUpdate, 1); // expectedRevision = 1
      },
      (err: any) => {
        assert.ok(err instanceof AegisError);
        assert.strictEqual(err.code, AegisErrorCode.REVISION_CONFLICT);
        assert.strictEqual(err.status, 409);
        return true;
      },
      "Stale write without matching revision must throw 409 REVISION_CONFLICT"
    );
  });

  test("3. Device B reconciles via delta sync cursor and resolves conflict", () => {
    // Device B queries delta sync since cursor 0
    const deltas = serverVaultStore.getSyncDeltas(testVaultId, 0, 50);
    assert.ok(deltas.events.length > 0);
    assert.ok(deltas.latestSeq > 0);

    // Device B now writes revision 3 with expectedRevision = 2
    const deviceBResolved: ItemEncryptionEnvelope = {
      ...initialEnvelope,
      revision: 3,
      ciphertext: "resolvedByDeviceB==",
      nonce: "newNonceB2==",
    };
    serverVaultStore.updateItem(deviceBResolved, 2);

    const resolved = serverVaultStore.getItem(testVaultId, itemId);
    assert.strictEqual(resolved.revision, 3);
  });

  test("4. Storage quota enforcement: Requesting > 1GB throws 413 FILE_TOO_LARGE", () => {
    const hugeCiphertextBytes = 2 * 1024 * 1024 * 1024; // 2 GB

    assert.throws(
      () => {
        serverVaultStore.initiateFileUpload(
          testVaultId,
          itemId,
          10,
          hugeCiphertextBytes
        );
      },
      (err: any) => {
        assert.ok(err instanceof AegisError);
        assert.strictEqual(err.code, AegisErrorCode.FILE_TOO_LARGE);
        assert.strictEqual(err.status, 413);
        return true;
      },
      "Uploads exceeding quota must be rejected with 413"
    );
  });
});
