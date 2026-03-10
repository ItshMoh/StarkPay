import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Plus, Trash2, CheckCircle, AlertCircle, ChevronLeft, Download, LoaderCircle } from 'lucide-react';
import { sepolia } from '@starknet-react/chains';
import {
  useAccount,
  useNetwork,
  useProvider,
  useSendTransaction,
  useSwitchChain,
} from '@starknet-react/core';
import { hash, num } from 'starknet';
import { PAYROLL_DISPATCHER_ADDRESS, SHIELDED_POOL_ADDRESS, TBTC_TOKEN_ADDRESS, STARKSCAN_SEPOLIA_TX_BASE } from '../lib/config';
import { formatIsoDate, shortAddress } from '../lib/format';
import { prependPayrollHistory } from '../lib/payrollHistory';
import { validatePayrollCsv } from '../lib/payrollApi';
import type { DenominationBundle, IngestCsvResult } from '../lib/payrollApi';

const CSV_HEADER = 'wallet_address,amount,employee_name';

type ManualRecipient = {
  id: string;
  walletAddress: string;
  amount: string;
  employeeName: string;
};

type PreviewRecipient = {
  id: string;
  rowNumber: number;
  walletAddress: string;
  amount: string;
  employeeName: string;
  status: 'valid' | 'invalid';
  errors: string[];
  denominationBundle?: DenominationBundle;
  receiptId?: string;
};

type TxPhase = 'idle' | 'submitting' | 'confirming' | 'confirmed' | 'failed';

type TxState = {
  phase: TxPhase;
  txHash?: string;
  updatedAt: string;
  error?: string;
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(line: string): string {
  return line
    .split(',')
    .map((cell) => cell.trim().toLowerCase())
    .join(',');
}

function quoteCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function extractCsvBodyRows(csvText: string): string[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  if (normalizeHeader(lines[0]) === CSV_HEADER) {
    return lines.slice(1);
  }

  return lines;
}

function randomFelt(): string {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isReceiptSuccessful(receipt: unknown): boolean {
  if (!receipt || typeof receipt !== 'object') return false;
  const receiptLike = receipt as { execution_status?: string; value?: { execution_status?: string } };
  const executionStatus = receiptLike.execution_status ?? receiptLike.value?.execution_status;
  return executionStatus !== 'REVERTED';
}

export default function Send() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { provider } = useProvider();
  const { sendAsync, error: sendError } = useSendTransaction({});
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain({});

  const [manualWalletAddress, setManualWalletAddress] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualEmployeeName, setManualEmployeeName] = useState('');
  const [payrollNote, setPayrollNote] = useState('');
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([]);
  const [uploadedCsv, setUploadedCsv] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<IngestCsvResult | null>(null);
  const [validationRows, setValidationRows] = useState<PreviewRecipient[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [txState, setTxState] = useState<TxState>({
    phase: 'idle',
    updatedAt: new Date().toISOString(),
  });

  const isOnSepolia = chain.id === sepolia.id;
  const canSubmitTransaction =
    isConnected &&
    isOnSepolia &&
    validationResult !== null &&
    validationResult.validCount > 0 &&
    validationResult.invalidCount === 0 &&
    txState.phase !== 'submitting' &&
    txState.phase !== 'confirming';

  const totalInputRecipients = manualRecipients.length + extractCsvBodyRows(uploadedCsv).length;

  function resetValidationOutput() {
    setValidationResult(null);
    setValidationRows([]);
    setValidationError(null);
    setTxState({
      phase: 'idle',
      updatedAt: new Date().toISOString(),
    });
  }

  function addManualRecipient() {
    if (!manualWalletAddress.trim() || !manualAmount.trim()) {
      setValidationError('Recipient address and amount are required for manual rows.');
      return;
    }

    setValidationError(null);
    setManualRecipients((rows) => [
      ...rows,
      {
        id: crypto.randomUUID(),
        walletAddress: manualWalletAddress.trim(),
        amount: manualAmount.trim(),
        employeeName: manualEmployeeName.trim() || 'Unknown',
      },
    ]);
    setManualWalletAddress('');
    setManualAmount('');
    setManualEmployeeName('');
    resetValidationOutput();
  }

  function removeManualRecipient(id: string) {
    setManualRecipients((rows) => rows.filter((row) => row.id !== id));
    resetValidationOutput();
  }

  async function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadedCsv(text);
    setUploadedFileName(file.name);
    resetValidationOutput();
  }

  function buildValidationCsv(): { csv: string; rowLines: string[] } {
    const csvRows: string[] = [];

    if (uploadedCsv.trim()) {
      csvRows.push(...extractCsvBodyRows(uploadedCsv));
    }

    for (const row of manualRecipients) {
      csvRows.push(
        `${quoteCsvCell(row.walletAddress)},${quoteCsvCell(row.amount)},${quoteCsvCell(row.employeeName)}`,
      );
    }

    return {
      csv: `${CSV_HEADER}\n${csvRows.join('\n')}`,
      rowLines: csvRows,
    };
  }

  async function runValidation() {
    const { csv, rowLines } = buildValidationCsv();

    if (rowLines.length === 0) {
      setValidationError('Add at least one manual row or upload a CSV before validating.');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setTxState({
      phase: 'idle',
      updatedAt: new Date().toISOString(),
    });

    try {
      const result = await validatePayrollCsv(csv);
      const validByRow = new Map(result.receipts.map((receipt) => [receipt.rowNumber, receipt]));
      const invalidByRow = new Map(result.invalidRows.map((row) => [row.rowNumber, row]));

      const previewRows: PreviewRecipient[] = rowLines.map((raw, index) => {
        const rowNumber = index + 2;
        let cells: string[] = [];

        try {
          cells = parseCsvLine(raw);
        } catch {
          return {
            id: `${rowNumber}-${raw}`,
            rowNumber,
            walletAddress: raw,
            amount: '',
            employeeName: '',
            status: 'invalid',
            errors: ['Unable to parse this row'],
          };
        }

        const [walletAddress = '', amount = '', employeeName = ''] = cells;
        const invalid = invalidByRow.get(rowNumber);
        const valid = validByRow.get(rowNumber);

        if (invalid) {
          return {
            id: `${rowNumber}-${raw}`,
            rowNumber,
            walletAddress,
            amount,
            employeeName,
            status: 'invalid',
            errors: invalid.errors,
          };
        }

        return {
          id: `${rowNumber}-${raw}`,
          rowNumber,
          walletAddress,
          amount,
          employeeName,
          status: valid ? 'valid' : 'invalid',
          errors: valid ? [] : ['Row was not accepted'],
          denominationBundle: valid?.denominationBundle,
          receiptId: valid?.receiptId,
        };
      });

      setValidationResult(result);
      setValidationRows(previewRows);

      if (result.invalidCount > 0) {
        setValidationError(`${result.invalidCount} row(s) are invalid. Fix them before submitting.`);
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'CSV validation failed');
      setValidationResult(null);
      setValidationRows([]);
    } finally {
      setIsValidating(false);
    }
  }

  function clearAll() {
    setManualRecipients([]);
    setUploadedCsv('');
    setUploadedFileName(null);
    setPayrollNote('');
    resetValidationOutput();
  }

  function downloadErrorRows() {
    if (!validationResult || validationResult.invalidRows.length === 0) {
      return;
    }

    const csv = [
      'row_number,raw,errors',
      ...validationResult.invalidRows.map((row) => {
        return `${row.rowNumber},"${row.raw.replaceAll('"', '""')}","${row.errors.join(' | ').replaceAll('"', '""')}"`;
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payroll-invalid-rows.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submitPayroll() {
    if (!validationResult) return;
    if (!isConnected || !address) {
      setValidationError('Connect your wallet before sending payroll.');
      return;
    }
    if (!isOnSepolia) {
      setValidationError('Switch your wallet to Starknet Sepolia before sending payroll.');
      return;
    }

    const batchHash = hash.computeHashOnElements([
      Date.now(),
      validationResult.validCount,
      validationResult.totalAmountUnits,
      num.toHex(validationResult.totalNotes),
    ]);

    // Build per-note commitments and amounts from denomination bundles
    const commitments: string[] = [];
    const amounts: string[] = [];
    for (const receipt of validationResult.receipts) {
      const bundle = receipt.denominationBundle;
      for (let i = 0; i < bundle.note_5; i += 1) {
        commitments.push(randomFelt());
        amounts.push(num.toHex(5));
      }
      for (let i = 0; i < bundle.note_2; i += 1) {
        commitments.push(randomFelt());
        amounts.push(num.toHex(2));
      }
      for (let i = 0; i < bundle.note_1; i += 1) {
        commitments.push(randomFelt());
        amounts.push(num.toHex(1));
      }
    }

    const proofHash = '0x42';
    const totalTokenAmount = validationResult.totalAmountUnits;

    const historyBase = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      type: 'send' as const,
      recipientCount: validationResult.validCount,
      totalAmount: validationResult.totalAmount,
      totalAmountUnits: validationResult.totalAmountUnits,
      batchHash,
    };

    try {
      setTxState({
        phase: 'submitting',
        updatedAt: new Date().toISOString(),
      });

      // Single multicall: approve token spend + run_payroll (queue + deposit + execute)
      const result = await sendAsync([
        {
          contractAddress: TBTC_TOKEN_ADDRESS,
          entrypoint: 'approve',
          calldata: [
            SHIELDED_POOL_ADDRESS,
            num.toHex(totalTokenAmount), // u256 low
            '0x0',                       // u256 high
          ],
        },
        {
          contractAddress: PAYROLL_DISPATCHER_ADDRESS,
          entrypoint: 'run_payroll',
          calldata: [
            batchHash,
            num.toHex(validationResult.validCount),
            num.toHex(validationResult.totalAmountUnits),
            num.toHex(commitments.length),
            ...commitments,
            num.toHex(amounts.length),
            ...amounts,
            proofHash,
          ],
        },
      ]);

      const txHash = result.transaction_hash;
      setTxState({
        phase: 'confirming',
        txHash,
        updatedAt: new Date().toISOString(),
      });

      await provider.waitForTransaction(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!isReceiptSuccessful(receipt)) {
        throw new Error('Transaction reverted');
      }

      setTxState({
        phase: 'confirmed',
        txHash,
        updatedAt: new Date().toISOString(),
      });

      prependPayrollHistory({
        ...historyBase,
        status: 'success',
        queueTxHash: txHash,
        executeTxHash: txHash,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction failed';
      setTxState((previous) => ({
        ...previous,
        phase: 'failed',
        updatedAt: new Date().toISOString(),
        error: message,
      }));

      prependPayrollHistory({
        ...historyBase,
        status: 'failed',
        error: message,
      });
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative">
      <div className="px-8 lg:px-16 xl:px-24 py-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-12">
          <Link to="/dashboard" className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500 rounded-full">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-4xl font-medium tracking-tight">Send Payroll</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <div className="border border-neutral-200 dark:border-neutral-800 p-6 bg-neutral-50/50 dark:bg-[#111111]/50">
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-4">Batch Upload</h3>
              <label className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md p-8 flex flex-col items-center justify-center text-center hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer mb-4">
                <Upload size={24} className="text-neutral-400 mb-3" />
                <p className="text-sm font-medium mb-1">Click to upload CSV</p>
                <p className="text-xs text-neutral-500">{uploadedFileName ?? 'No file selected'}</p>
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
              <div className="flex gap-3">
                <button onClick={runValidation} disabled={isValidating} className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[10px] uppercase disabled:opacity-50">
                  {isValidating ? 'Validating...' : 'Validate CSV'}
                </button>
                <button onClick={downloadErrorRows} disabled={!validationResult || validationResult.invalidRows.length === 0} className="flex-1 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-semibold transition-colors tracking-[0.15em] text-[10px] uppercase text-neutral-500 flex justify-center items-center gap-2 disabled:opacity-50">
                  <Download size={14} /> Errors
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1"></div>
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase">OR</span>
              <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1"></div>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 p-6">
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-4">Manual Entry</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Recipient Address *</label>
                  <input value={manualWalletAddress} onChange={(event) => setManualWalletAddress(event.target.value)} type="text" placeholder="0x..." className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Amount (BTC) *</label>
                  <input value={manualAmount} onChange={(event) => setManualAmount(event.target.value)} type="text" placeholder="0.00" className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Employee Name (Optional)</label>
                  <input value={manualEmployeeName} onChange={(event) => setManualEmployeeName(event.target.value)} type="text" placeholder="John Doe" className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors" />
                </div>
              </div>

              <button onClick={addManualRecipient} className="w-full py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex justify-center items-center gap-2">
                <Plus size={14} /> Add Recipient
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Payroll Note (Optional)</label>
              <textarea value={payrollNote} onChange={(event) => setPayrollNote(event.target.value)} placeholder="e.g., October Salary batch" className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors resize-none h-20"></textarea>
            </div>

            {!isOnSepolia && isConnected && (
              <button onClick={() => switchChain({ chainId: num.toHex(sepolia.id) })} disabled={isSwitchingNetwork} className="w-full py-3 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase disabled:opacity-50">
                {isSwitchingNetwork ? 'Switching...' : 'Switch to Starknet Sepolia'}
              </button>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium">Payroll Preview</h2>
              <button onClick={clearAll} className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 px-4">
              <div className="col-span-1">Row</div>
              <div className="col-span-3">Wallet Address</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Employee</div>
              <div className="col-span-3">Denomination</div>
              <div className="col-span-1 text-center">Status</div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[320px] mb-8">
              {validationRows.length === 0 && (
                <div className="text-sm text-neutral-500 py-6">No validated rows yet. Add rows and click Validate CSV.</div>
              )}

              {validationRows.map((row) => (
                <div key={row.id} className={`grid grid-cols-12 gap-4 text-sm items-center py-4 border-b border-neutral-100 dark:border-neutral-800/50 px-4 -mx-4 ${row.status === 'invalid' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <div className="col-span-1 text-xs text-neutral-500">{row.rowNumber}</div>
                  <div className="col-span-3 font-mono text-xs truncate pr-2" title={row.walletAddress}>{row.walletAddress}</div>
                  <div className="col-span-2 text-xs">{row.amount}</div>
                  <div className="col-span-2 text-xs truncate pr-2">{row.employeeName}</div>
                  <div className="col-span-3 text-xs text-neutral-500">
                    {row.denominationBundle
                      ? `5:${row.denominationBundle.note_5} / 2:${row.denominationBundle.note_2} / 1:${row.denominationBundle.note_1}`
                      : row.errors.join(' | ')}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {row.status === 'valid' ? <CheckCircle size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-500" />}
                  </div>
                </div>
              ))}
            </div>

            {manualRecipients.length > 0 && validationRows.length === 0 && (
              <div className="border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
                <h3 className="text-xs uppercase tracking-[0.12em] font-semibold text-neutral-500 mb-2">Manual Rows Pending Validation</h3>
                <div className="space-y-2">
                  {manualRecipients.map((row) => (
                    <div key={row.id} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{row.walletAddress} | {row.amount} | {row.employeeName}</span>
                      <button onClick={() => removeManualRecipient(row.id)} className="text-neutral-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6 mt-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <div className="text-sm text-neutral-500 mb-1">Input rows: <span className="font-medium text-neutral-900 dark:text-white">{totalInputRecipients}</span></div>
                  <div className="text-sm text-neutral-500 mb-1">Connected wallet: <span className="font-medium text-neutral-900 dark:text-white">{shortAddress(address)}</span></div>
                  <div className="text-sm text-neutral-500">Network: <span className={`font-medium ${isOnSepolia ? 'text-neutral-900 dark:text-white' : 'text-red-500'}`}>{chain.name}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500 mb-1 uppercase tracking-widest font-bold">Total Amount</div>
                  <div className="text-3xl font-medium tracking-tight">{validationResult ? `${validationResult.totalAmount} BTC` : '0.00 BTC'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="text-xs p-3 border border-neutral-200 dark:border-neutral-800">
                  Valid recipients: <span className="font-semibold">{validationResult?.validCount ?? 0}</span>
                </div>
                <div className="text-xs p-3 border border-neutral-200 dark:border-neutral-800">
                  Invalid recipients: <span className="font-semibold">{validationResult?.invalidCount ?? 0}</span>
                </div>
                <div className="text-xs p-3 border border-neutral-200 dark:border-neutral-800">
                  Total notes: <span className="font-semibold">{validationResult?.totalNotes ?? 0}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={runValidation} disabled={isValidating} className="flex-1 py-4 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase disabled:opacity-50">
                  Preview Transfer
                </button>
                <button onClick={submitPayroll} disabled={!canSubmitTransaction} className="flex-1 py-4 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                  Send
                </button>
              </div>

              <div className="mt-4 p-3 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 flex items-center gap-2">
                {isValidating ||
                txState.phase === 'submitting' ||
                txState.phase === 'confirming' ? (
                  <LoaderCircle size={14} className="animate-spin text-yellow-500" />
                ) : txState.phase === 'confirmed' ? (
                  <CheckCircle size={14} className="text-green-500" />
                ) : txState.phase === 'failed' ? (
                  <AlertCircle size={14} className="text-red-500" />
                ) : (
                  <CheckCircle size={14} className="text-neutral-400" />
                )}
                <span>
                  {validationError ||
                    (sendError?.message ?? txState.error) ||
                    (txState.phase === 'confirmed'
                      ? 'Payroll executed — tokens deposited into shielded pool.'
                      : txState.phase === 'confirming'
                        ? 'Waiting for transaction confirmation...'
                        : txState.phase === 'submitting'
                          ? 'Submitting payroll transaction...'
                          : 'Ready to validate and send payroll.')}
                </span>
              </div>

              {txState.txHash && (
                <div className="mt-3 text-xs text-neutral-500 space-y-1">
                  <div>
                    Transaction:{' '}
                    <a href={`${STARKSCAN_SEPOLIA_TX_BASE}${txState.txHash}`} target="_blank" rel="noreferrer" className="font-mono text-[#F28C38] hover:underline">
                      {shortAddress(txState.txHash, 10, 8)}
                    </a>
                  </div>
                  <div>Updated: {formatIsoDate(txState.updatedAt)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
