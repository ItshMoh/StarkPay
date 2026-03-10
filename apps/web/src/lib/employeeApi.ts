import { API_BASE_URL } from './config';

export type DenominationBundle = {
  note_5: number;
  note_2: number;
  note_1: number;
  totalNotes: number;
};

export type EncryptedBlob = {
  algorithm: string;
  iv: string;
  authTag: string;
  ciphertext: string;
};

export type PayrollReceiptMetadata = {
  rowNumber: number;
  walletAddress: string;
  amount: string;
  amountUnits: number;
  employeeName: string;
  denominationBundle: DenominationBundle;
  createdAt: string;
};

export type ReceiptResult = {
  receiptId: string;
  createdAt: string;
  encryptedBlob: EncryptedBlob;
  decryptedMetadata?: PayrollReceiptMetadata;
  decryptionAllowed: boolean;
};

export type WalletReceiptsResponse = {
  receipts: ReceiptResult[];
};

export async function fetchReceiptsByWallet(
  walletAddress: string,
  decryptionContext?: string,
): Promise<ReceiptResult[]> {
  const url = new URL(`${API_BASE_URL}/receipts/wallet/${walletAddress}`);
  if (decryptionContext) {
    url.searchParams.set('include_decrypted', 'true');
  }

  const headers: Record<string, string> = {};
  if (decryptionContext) {
    headers['x-decryption-context'] = decryptionContext;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch receipts');
  }

  const data = (await response.json()) as WalletReceiptsResponse;
  return data.receipts;
}

/**
 * Decrypt an encrypted blob client-side using Web Crypto API (AES-256-GCM).
 * The secret is hashed with SHA-256 to produce the 32-byte key, matching the server.
 */
export async function decryptBlobClientSide(
  blob: EncryptedBlob,
  secret: string,
): Promise<PayrollReceiptMetadata> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(secret));

  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  const iv = Uint8Array.from(atob(blob.iv), (c) => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(blob.authTag), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(blob.ciphertext), (c) => c.charCodeAt(0));

  // AES-GCM in Web Crypto expects ciphertext + authTag concatenated
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    combined,
  );

  const decoded = new TextDecoder().decode(plaintext);
  return JSON.parse(decoded) as PayrollReceiptMetadata;
}
