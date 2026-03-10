import { randomUUID } from "node:crypto";
import type { EncryptedBlob, StoredReceipt } from "./types.js";

export class EncryptedReceiptStore {
  private readonly records = new Map<string, StoredReceipt>();
  private readonly walletIndex = new Map<string, string[]>();

  create(encryptedBlob: EncryptedBlob, walletAddress: string): StoredReceipt {
    const receiptId = randomUUID();
    const createdAt = new Date().toISOString();

    const record: StoredReceipt = {
      receiptId,
      createdAt,
      encryptedBlob,
      walletAddress,
    };

    this.records.set(receiptId, record);

    const normalized = walletAddress.toLowerCase();
    const existing = this.walletIndex.get(normalized) ?? [];
    existing.push(receiptId);
    this.walletIndex.set(normalized, existing);

    return record;
  }

  get(receiptId: string): StoredReceipt | undefined {
    return this.records.get(receiptId);
  }

  getByWallet(walletAddress: string): StoredReceipt[] {
    const normalized = walletAddress.toLowerCase();
    const ids = this.walletIndex.get(normalized) ?? [];
    return ids
      .map((id) => this.records.get(id))
      .filter((r): r is StoredReceipt => r !== undefined);
  }
}
