import { argon2id } from "hash-wasm";
import { KdfParameters } from "@aegis/shared";
import { getRandomBytes } from "../primitives/utils.js";

export const DEFAULT_ARGON2_PARAMS: KdfParameters = {
  m: 65536, // 64 MB
  t: 3,     // 3 iterations
  p: 4,     // 4 threads/lanes
};

/**
 * Derives a 32-byte (256-bit) Key Encryption Key (KEK) using Argon2id.
 */
export async function deriveKeyArgon2id(
  passphrase: string,
  salt: Uint8Array,
  params: KdfParameters = DEFAULT_ARGON2_PARAMS
): Promise<Uint8Array> {
  if (salt.byteLength < 16) {
    throw new Error("Argon2id salt must be at least 16 bytes.");
  }

  const derived = await argon2id({
    password: passphrase,
    salt,
    parallelism: params.p,
    iterations: params.t,
    memorySize: params.m,
    hashLength: 32, // 256-bit output
    outputType: "binary",
  });

  return derived;
}

/**
 * Generates a fresh 16-byte cryptographically random salt for Argon2id.
 */
export function generateKdfSalt(): Uint8Array {
  return getRandomBytes(16);
}

