export type DenominationBundle = {
  note_5: number;
  note_2: number;
  note_1: number;
  totalNotes: number;
};

export type ParsedPayrollRow = {
  rowNumber: number;
  walletAddress: string;
  amount: string;
  amountUnits: number;
  employeeName: string;
  denominationBundle: DenominationBundle;
};

export type CsvValidationError = {
  rowNumber: number;
  raw: string;
  errors: string[];
};

export type ParsedCsvResult = {
  validRows: ParsedPayrollRow[];
  invalidRows: CsvValidationError[];
};

export type EncryptedBlob = {
  algorithm: "aes-256-gcm";
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

export type StoredReceipt = {
  receiptId: string;
  createdAt: string;
  encryptedBlob: EncryptedBlob;
  walletAddress: string;
};

export type CreatedReceipt = {
  receiptId: string;
  createdAt: string;
  encryptedBlob: EncryptedBlob;
  rowNumber: number;
  walletAddress: string;
  amount: string;
  employeeName: string;
  denominationBundle: DenominationBundle;
};

export type IngestCsvResult = {
  batchId: string;
  validCount: number;
  invalidCount: number;
  totalAmountUnits: number;
  totalAmount: string;
  totalNotes: number;
  receipts: CreatedReceipt[];
  invalidRows: CsvValidationError[];
};

export type GetReceiptResult = {
  receiptId: string;
  createdAt: string;
  encryptedBlob: EncryptedBlob;
  decryptedMetadata?: PayrollReceiptMetadata;
  decryptionAllowed: boolean;
};

export interface IReceiptStore {
  create(encryptedBlob: EncryptedBlob, walletAddress: string): Promise<StoredReceipt>;
  get(receiptId: string): Promise<StoredReceipt | undefined>;
  getByWallet(walletAddress: string): Promise<StoredReceipt[]>;
}
