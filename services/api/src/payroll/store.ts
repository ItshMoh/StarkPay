import { randomUUID } from "node:crypto";
import type { EncryptedBlob, StoredReceipt } from "./types.js";

export class EncryptedReceiptStore {
  private readonly records = new Map<string, StoredReceipt>();

  create(encryptedBlob: EncryptedBlob): StoredReceipt {
    const receiptId = randomUUID();
    const createdAt = new Date().toISOString();

    const record: StoredReceipt = {
      receiptId,
      createdAt,
      encryptedBlob,
    };

    this.records.set(receiptId, record);
    return record;
  }

  get(receiptId: string): StoredReceipt | undefined {
    return this.records.get(receiptId);
  }
}
