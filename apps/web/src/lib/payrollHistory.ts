const STORAGE_KEY = 'onchainpayroll.phase6.history';

export type PayrollTxStatus = 'success' | 'pending' | 'failed';

export type PayrollHistoryEntry = {
  id: string;
  createdAt: string;
  type: 'send';
  status: PayrollTxStatus;
  recipientCount: number;
  totalAmount: string;
  totalAmountUnits: number;
  batchHash: string;
  batchId?: string;
  queueTxHash?: string;
  executeTxHash?: string;
  error?: string;
};

export function loadPayrollHistory(): PayrollHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PayrollHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function savePayrollHistory(entries: PayrollHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function prependPayrollHistory(entry: PayrollHistoryEntry): void {
  const current = loadPayrollHistory();
  savePayrollHistory([entry, ...current].slice(0, 100));
}
