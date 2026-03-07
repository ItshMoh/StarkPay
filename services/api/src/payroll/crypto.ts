import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { EncryptedBlob, PayrollReceiptMetadata } from "./types.js";

function resolveKeyMaterial(secret: string): Buffer {
  const normalized = secret.trim();

  if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
    return Buffer.from(normalized, "hex");
  }

  return createHash("sha256").update(normalized).digest();
}

export function buildEncryptionKey(secret: string): Buffer {
  const key = resolveKeyMaterial(secret);
  if (key.length !== 32) {
    throw new Error("Encryption key must resolve to 32 bytes");
  }
  return key;
}

export function encryptMetadata(payload: PayrollReceiptMetadata, key: Buffer): EncryptedBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptMetadata(blob: EncryptedBlob, key: Buffer): PayrollReceiptMetadata {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(blob.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(blob.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as PayrollReceiptMetadata;
}
