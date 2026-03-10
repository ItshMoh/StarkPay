import { API_BASE_URL } from './config';

export type DenominationBundle = {
  note_5: number;
  note_2: number;
  note_1: number;
  totalNotes: number;
};

export type CreatedReceipt = {
  receiptId: string;
  createdAt: string;
  rowNumber: number;
  walletAddress: string;
  amount: string;
  employeeName: string;
  denominationBundle: DenominationBundle;
};

export type CsvValidationError = {
  rowNumber: number;
  raw: string;
  errors: string[];
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

function getApiErrorMessage(payload: unknown): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error;
  }
  return 'Request failed';
}

export async function validatePayrollCsv(csv: string): Promise<IngestCsvResult> {
  const response = await fetch(`${API_BASE_URL}/payroll/csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ csv }),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload));
  }

  return payload as IngestCsvResult;
}
