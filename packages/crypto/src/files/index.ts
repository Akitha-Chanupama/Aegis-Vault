import { FileChunkManifest } from "@aegis/shared";
import {
  deriveSubkey,
  exportRawKey,
  encryptAesGcm,
  decryptAesGcm,
} from "../primitives/aes.js";
import {
  stringToUtf8,
  utf8ToString,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "../primitives/utils.js";

export function buildChunkAad(
  fileId: string,
  chunkIndex: number,
  totalChunks: number
): string {
  return `AEGIS-CHUNK:v1:${fileId}:${chunkIndex}:${totalChunks}`;
}

export function buildManifestAad(fileId: string): string {
  return `AEGIS-MANIFEST:v1:${fileId}`;
}

export async function deriveFileKey(
  vrk: CryptoKey,
  fileId: string
): Promise<CryptoKey> {
  const masterBytes = await exportRawKey(vrk);
  return await deriveSubkey(masterBytes, fileId, "aegis-file-v1");
}

export async function deriveThumbnailKey(
  vrk: CryptoKey,
  fileId: string
): Promise<CryptoKey> {
  const masterBytes = await exportRawKey(vrk);
  return await deriveSubkey(masterBytes, fileId, "aegis-thumb-v1");
}

export async function encryptChunk(
  fileKey: CryptoKey,
  chunkBytes: Uint8Array,
  fileId: string,
  chunkIndex: number,
  totalChunks: number
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const aad = buildChunkAad(fileId, chunkIndex, totalChunks);
  return await encryptAesGcm(fileKey, chunkBytes, aad);
}

export async function decryptChunk(
  fileKey: CryptoKey,
  ciphertextBytes: Uint8Array,
  nonceBytes: Uint8Array,
  fileId: string,
  chunkIndex: number,
  totalChunks: number
): Promise<Uint8Array> {
  const aad = buildChunkAad(fileId, chunkIndex, totalChunks);
  return await decryptAesGcm(fileKey, ciphertextBytes, nonceBytes, aad);
}

export async function encryptManifest(
  fileKey: CryptoKey,
  fileId: string,
  manifest: FileChunkManifest
): Promise<{ encryptedManifest: string; manifestNonce: string }> {
  const aad = buildManifestAad(fileId);
  const jsonBytes = stringToUtf8(JSON.stringify(manifest));
  const { ciphertext, nonce } = await encryptAesGcm(fileKey, jsonBytes, aad);

  return {
    encryptedManifest: uint8ArrayToBase64(ciphertext),
    manifestNonce: uint8ArrayToBase64(nonce),
  };
}

export async function decryptManifest(
  fileKey: CryptoKey,
  fileId: string,
  encryptedManifestBase64: string,
  manifestNonceBase64: string
): Promise<FileChunkManifest> {
  const aad = buildManifestAad(fileId);
  const ciphertextBytes = base64ToUint8Array(encryptedManifestBase64);
  const nonceBytes = base64ToUint8Array(manifestNonceBase64);

  const decryptedBytes = await decryptAesGcm(fileKey, ciphertextBytes, nonceBytes, aad);
  return JSON.parse(utf8ToString(decryptedBytes));
}
