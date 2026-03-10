import { randomUUID } from "node:crypto";
import { formatUnits } from "./denominations.js";
import { parsePayrollCsv } from "./csv.js";
import { buildEncryptionKey, decryptMetadata, encryptMetadata } from "./crypto.js";
import { MemoryReceiptStore } from "./store.js";
import type {
  GetReceiptResult,
  IReceiptStore,
  IngestCsvResult,
  PayrollReceiptMetadata,
} from "./types.js";

export type PayrollServiceConfig = {
  encryptionSecret: string;
  decryptionContext: string;
};

const DEFAULT_CONFIG: PayrollServiceConfig = {
  encryptionSecret: "phase5-dev-encryption-secret",
  decryptionContext: "phase5-decryption-context",
};

export class PayrollService {
  private readonly encryptionKey: Buffer;

  private readonly decryptionContext: string;

  private readonly store: IReceiptStore;

  constructor(config?: Partial<PayrollServiceConfig>, store?: IReceiptStore) {
    const resolvedEncryptionSecret =
      typeof config?.encryptionSecret === "string" && config.encryptionSecret.trim().length > 0
        ? config.encryptionSecret
        : DEFAULT_CONFIG.encryptionSecret;
    const resolvedDecryptionContext =
      typeof config?.decryptionContext === "string" && config.decryptionContext.trim().length > 0
        ? config.decryptionContext
        : DEFAULT_CONFIG.decryptionContext;

    this.encryptionKey = buildEncryptionKey(resolvedEncryptionSecret);
    this.decryptionContext = resolvedDecryptionContext;
    this.store = store ?? new MemoryReceiptStore();
  }

  async ingestCsv(csvText: string): Promise<IngestCsvResult> {
    const parsed = parsePayrollCsv(csvText);
    const batchId = randomUUID();

    let totalAmountUnits = 0;
    let totalNotes = 0;

    const receipts = [];
    for (const row of parsed.validRows) {
      totalAmountUnits += row.amountUnits;
      totalNotes += row.denominationBundle.totalNotes;

      const metadata: PayrollReceiptMetadata = {
        rowNumber: row.rowNumber,
        walletAddress: row.walletAddress,
        amount: row.amount,
        amountUnits: row.amountUnits,
        employeeName: row.employeeName,
        denominationBundle: row.denominationBundle,
        createdAt: new Date().toISOString(),
      };

      const encryptedBlob = encryptMetadata(metadata, this.encryptionKey);
      const stored = await this.store.create(encryptedBlob, row.walletAddress);

      receipts.push({
        receiptId: stored.receiptId,
        createdAt: stored.createdAt,
        encryptedBlob: stored.encryptedBlob,
        rowNumber: row.rowNumber,
        walletAddress: row.walletAddress,
        amount: row.amount,
        employeeName: row.employeeName,
        denominationBundle: row.denominationBundle,
      });
    }

    return {
      batchId,
      validCount: parsed.validRows.length,
      invalidCount: parsed.invalidRows.length,
      totalAmountUnits,
      totalAmount: formatUnits(totalAmountUnits),
      totalNotes,
      receipts,
      invalidRows: parsed.invalidRows,
    };
  }

  async getReceiptsByWallet(
    walletAddress: string,
    includeDecrypted: boolean,
    providedDecryptionContext?: string,
  ): Promise<GetReceiptResult[]> {
    const stored = await this.store.getByWallet(walletAddress);

    const hasValidContext =
      includeDecrypted &&
      typeof providedDecryptionContext === "string" &&
      providedDecryptionContext === this.decryptionContext;

    return stored.map((record) => {
      const base: GetReceiptResult = {
        receiptId: record.receiptId,
        createdAt: record.createdAt,
        encryptedBlob: record.encryptedBlob,
        decryptionAllowed: hasValidContext,
      };

      if (!hasValidContext) return base;

      return {
        ...base,
        decryptedMetadata: decryptMetadata(record.encryptedBlob, this.encryptionKey),
      };
    });
  }

  async getReceipt(
    receiptId: string,
    includeDecrypted: boolean,
    providedDecryptionContext?: string,
  ): Promise<GetReceiptResult | null> {
    const stored = await this.store.get(receiptId);
    if (!stored) {
      return null;
    }

    const hasValidContext =
      includeDecrypted &&
      typeof providedDecryptionContext === "string" &&
      providedDecryptionContext === this.decryptionContext;

    const base: GetReceiptResult = {
      receiptId: stored.receiptId,
      createdAt: stored.createdAt,
      encryptedBlob: stored.encryptedBlob,
      decryptionAllowed: hasValidContext,
    };

    if (!hasValidContext) {
      return base;
    }

    return {
      ...base,
      decryptedMetadata: decryptMetadata(stored.encryptedBlob, this.encryptionKey),
    };
  }
}
