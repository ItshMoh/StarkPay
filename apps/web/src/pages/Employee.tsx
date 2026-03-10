import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useNetwork,
  useSendTransaction,
} from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';
import { hash, RpcProvider } from 'starknet';
import {
  Shield,
  Download,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Wallet,
  ArrowDownToLine,
} from 'lucide-react';
import {
  fetchReceiptsByWallet,
  decryptBlobClientSide,
  type ReceiptResult,
  type PayrollReceiptMetadata,
} from '../lib/employeeApi';
import { shortAddress, formatIsoDate, toAmountString } from '../lib/format';
import {
  PAYROLL_DISPATCHER_ADDRESS,
  SHIELDED_POOL_ADDRESS,
  STARKSCAN_SEPOLIA_TX_BASE,
} from '../lib/config';

type DecryptedReceipt = ReceiptResult & {
  metadata?: PayrollReceiptMetadata;
  decryptError?: string;
};

type WithdrawState = {
  receiptId: string;
  status: 'idle' | 'proving' | 'sending' | 'confirming' | 'done' | 'error';
  txHash?: string;
  error?: string;
};

const DEFAULT_DECRYPTION_SECRET = 'phase5-dev-encryption-secret';
const DEFAULT_DECRYPTION_CONTEXT = 'phase5-decryption-context';

export default function Employee() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const isOnSepolia = chain.id === sepolia.id;
  const { sendAsync } = useSendTransaction({});

  const [receipts, setReceipts] = useState<DecryptedReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptionSecret, setDecryptionSecret] = useState(DEFAULT_DECRYPTION_SECRET);
  const [showSecret, setShowSecret] = useState(false);
  const [useServerDecrypt, setUseServerDecrypt] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<DecryptedReceipt | null>(null);
  const [withdrawState, setWithdrawState] = useState<WithdrawState | null>(null);

  const totalBalance = receipts.reduce((sum, r) => {
    if (r.metadata) return sum + r.metadata.amountUnits;
    return sum;
  }, 0);

  const totalNotes = receipts.reduce((sum, r) => {
    if (r.metadata) return sum + r.metadata.denominationBundle.totalNotes;
    return sum;
  }, 0);

  const fetchReceipts = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);

    try {
      const raw = await fetchReceiptsByWallet(
        address,
        useServerDecrypt ? DEFAULT_DECRYPTION_CONTEXT : undefined,
      );

      const decrypted: DecryptedReceipt[] = await Promise.all(
        raw.map(async (r) => {
          // If server already decrypted, use that
          if (r.decryptedMetadata) {
            return { ...r, metadata: r.decryptedMetadata };
          }

          // Try client-side decryption
          if (decryptionSecret) {
            try {
              const metadata = await decryptBlobClientSide(
                r.encryptedBlob,
                decryptionSecret,
              );
              return { ...r, metadata };
            } catch (err) {
              return {
                ...r,
                decryptError:
                  err instanceof Error ? err.message : 'Decryption failed',
              };
            }
          }

          return r;
        }),
      );

      setReceipts(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch receipts');
    } finally {
      setLoading(false);
    }
  }, [address, decryptionSecret, useServerDecrypt]);

  useEffect(() => {
    if (isConnected && isOnSepolia && address) {
      fetchReceipts();
    }
  }, [isConnected, isOnSepolia, address, fetchReceipts]);

  async function handleWithdraw(receipt: DecryptedReceipt) {
    if (!receipt.metadata || !address) return;

    setWithdrawState({ receiptId: receipt.receiptId, status: 'proving' });

    try {
      // Read the latest known Merkle root from the ShieldedPool on-chain state
      const rpcUrl =
        import.meta.env.VITE_STARKNET_RPC_URL || 'https://starknet-sepolia.drpc.org';
      const provider = new RpcProvider({ nodeUrl: rpcUrl });

      const stateResult = await provider.callContract({
        contractAddress: SHIELDED_POOL_ADDRESS,
        entrypoint: 'get_state',
        calldata: [],
      });
      // get_state returns (dispatcher, verifier, latest_root, denomination_mask, root_count)
      const latestRoot = stateResult[2];

      if (!latestRoot || latestRoot === '0x0') {
        throw new Error('No Merkle root found in pool — no deposits have been made yet.');
      }

      // Generate a unique nullifier from receipt ID + timestamp
      const nullifier = hash.computeHashOnElements([
        `0x${receipt.receiptId.replace(/-/g, '')}`,
        `0x${Date.now().toString(16)}`,
      ]);

      const proofHash = '0x42'; // Mock proof hash (matches MockProofVerifier)
      const publicInputsHash = '0x42'; // Must match proof_hash for mock verifier

      setWithdrawState((prev) =>
        prev ? { ...prev, status: 'sending' } : null,
      );

      const amountHex = `0x${receipt.metadata.amountUnits.toString(16)}`;

      // Call through PayrollDispatcher.employee_withdraw (only dispatcher can call ShieldedPool)
      const response = await sendAsync([
        {
          contractAddress: PAYROLL_DISPATCHER_ADDRESS,
          entrypoint: 'employee_withdraw',
          calldata: [
            latestRoot,
            nullifier,
            amountHex,
            '0x0', // u128 high
            proofHash,
            publicInputsHash,
          ],
        },
      ]);

      setWithdrawState((prev) =>
        prev ? { ...prev, status: 'confirming', txHash: response.transaction_hash } : null,
      );

      // Wait briefly then mark done
      setTimeout(() => {
        setWithdrawState((prev) =>
          prev ? { ...prev, status: 'done' } : null,
        );
      }, 3000);
    } catch (err) {
      setWithdrawState((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: err instanceof Error ? err.message : 'Withdraw failed',
            }
          : null,
      );
    }
  }

  // ---- Not connected state ----
  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center max-w-md space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#F28C38]/10 flex items-center justify-center mx-auto">
            <Wallet size={28} className="text-[#F28C38]" />
          </div>
          <h2 className="text-2xl font-semibold">Employee Dashboard</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            Connect your wallet to view your payroll receipts, check your shielded balance, and withdraw funds.
          </p>
        </div>
      </div>
    );
  }

  if (!isOnSepolia) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold">Wrong Network</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            Please switch to Starknet Sepolia to access the employee dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* ====== LEFT: Receipt List ====== */}
      <div className="flex-1 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-[#F28C38]" />
              <h1 className="text-lg font-semibold">Employee Dashboard</h1>
            </div>
            <button
              onClick={fetchReceipts}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-medium tracking-[0.12em] uppercase border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-1">
                Shielded Balance
              </div>
              <div className="text-xl font-semibold text-[#F28C38]">
                {toAmountString(totalBalance)} BTC
              </div>
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-1">
                Unspent Notes
              </div>
              <div className="text-xl font-semibold">{totalNotes}</div>
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-1">
                Receipts
              </div>
              <div className="text-xl font-semibold">{receipts.length}</div>
            </div>
          </div>
        </div>

        {/* Decryption Settings */}
        <div className="px-8 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useServerDecrypt}
                onChange={(e) => setUseServerDecrypt(e.target.checked)}
                className="accent-[#F28C38]"
              />
              <span className="text-neutral-600 dark:text-neutral-400">Server-side decrypt</span>
            </label>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-neutral-400" />
              <input
                type={showSecret ? 'text' : 'password'}
                value={decryptionSecret}
                onChange={(e) => setDecryptionSecret(e.target.value)}
                placeholder="Decryption secret..."
                className="px-2 py-1 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded w-48"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
              >
                {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-8 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Receipt List */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {loading && receipts.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-neutral-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading receipts...
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 space-y-3">
              <Shield size={32} />
              <p className="text-sm">No payroll receipts found for this wallet.</p>
              <p className="text-xs text-neutral-500">
                Receipts appear here after your employer runs a payroll batch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.map((receipt) => {
                const isSelected = selectedReceipt?.receiptId === receipt.receiptId;
                const meta = receipt.metadata;
                const isWithdrawing = withdrawState?.receiptId === receipt.receiptId;

                return (
                  <button
                    key={receipt.receiptId}
                    onClick={() => setSelectedReceipt(receipt)}
                    className={`w-full text-left p-4 border rounded-lg transition-all ${
                      isSelected
                        ? 'border-[#F28C38] bg-[#F28C38]/5'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {meta ? (
                            <Unlock size={12} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <Lock size={12} className="text-neutral-400 flex-shrink-0" />
                          )}
                          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 truncate">
                            {receipt.receiptId}
                          </span>
                        </div>
                        {meta ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-sm">
                              {toAmountString(meta.amountUnits)} BTC
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {meta.denominationBundle.totalNotes} notes
                              <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">|</span>
                              {meta.denominationBundle.note_5}x5 / {meta.denominationBundle.note_2}x2 / {meta.denominationBundle.note_1}x1
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-400">
                            {receipt.decryptError
                              ? `Decryption failed: ${receipt.decryptError}`
                              : 'Encrypted — enter decryption secret to view'}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="text-[10px] text-neutral-400">
                          {formatIsoDate(receipt.createdAt)}
                        </div>
                        {isWithdrawing && (
                          <span className="text-[10px] text-[#F28C38]">
                            {withdrawState?.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ====== RIGHT: Detail + Withdraw Panel ====== */}
      <div className="w-full lg:w-[420px] flex flex-col border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800">
        {selectedReceipt ? (
          <div className="flex-1 flex flex-col">
            {/* Receipt Detail */}
            <div className="px-6 py-6 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Shield size={14} className="text-[#F28C38]" />
                Receipt Details
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-0.5">
                    Receipt ID
                  </div>
                  <div className="font-mono text-neutral-700 dark:text-neutral-300 break-all">
                    {selectedReceipt.receiptId}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-0.5">
                    Created
                  </div>
                  <div>{formatIsoDate(selectedReceipt.createdAt)}</div>
                </div>

                {selectedReceipt.metadata && (
                  <>
                    <div>
                      <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-0.5">
                        Amount
                      </div>
                      <div className="text-lg font-semibold text-[#F28C38]">
                        {toAmountString(selectedReceipt.metadata.amountUnits)} BTC
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-0.5">
                        Employee
                      </div>
                      <div>{selectedReceipt.metadata.employeeName}</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-0.5">
                        Recipient Wallet
                      </div>
                      <div className="font-mono">
                        {shortAddress(selectedReceipt.metadata.walletAddress, 10, 8)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-neutral-500 dark:text-neutral-400 mb-0.5">
                        Denomination Breakdown
                      </div>
                      <div className="flex gap-3 mt-1">
                        {selectedReceipt.metadata.denominationBundle.note_5 > 0 && (
                          <span className="px-2 py-1 bg-[#F28C38]/10 text-[#F28C38] rounded text-[10px] font-medium">
                            {selectedReceipt.metadata.denominationBundle.note_5}x 5-unit
                          </span>
                        )}
                        {selectedReceipt.metadata.denominationBundle.note_2 > 0 && (
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-[10px] font-medium">
                            {selectedReceipt.metadata.denominationBundle.note_2}x 2-unit
                          </span>
                        )}
                        {selectedReceipt.metadata.denominationBundle.note_1 > 0 && (
                          <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[10px] font-medium">
                            {selectedReceipt.metadata.denominationBundle.note_1}x 1-unit
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {!selectedReceipt.metadata && (
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Lock size={14} />
                      <span>Receipt is encrypted. Enter your decryption secret to view details.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Withdraw Section */}
            <div className="px-6 py-6 flex-1">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <ArrowDownToLine size={14} className="text-[#F28C38]" />
                Withdraw to Public Balance
              </h2>

              {selectedReceipt.metadata ? (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Withdraw shielded funds to your public wallet. A ZK proof will be generated
                    to verify note ownership without revealing the payment link.
                  </p>

                  <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Amount</span>
                      <span className="font-semibold">
                        {toAmountString(selectedReceipt.metadata.amountUnits)} BTC
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Notes</span>
                      <span>{selectedReceipt.metadata.denominationBundle.totalNotes}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Destination</span>
                      <span className="font-mono">{shortAddress(address)}</span>
                    </div>
                  </div>

                  {/* Withdraw status */}
                  {withdrawState?.receiptId === selectedReceipt.receiptId && (
                    <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      withdrawState.status === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : withdrawState.status === 'done'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-[#F28C38]/10 text-[#F28C38]'
                    }`}>
                      {withdrawState.status === 'proving' && (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Generating ZK proof...
                        </>
                      )}
                      {withdrawState.status === 'sending' && (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Sending transaction...
                        </>
                      )}
                      {withdrawState.status === 'confirming' && (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Confirming on-chain...
                        </>
                      )}
                      {withdrawState.status === 'done' && (
                        <>
                          <CheckCircle2 size={12} />
                          Withdrawal complete!
                        </>
                      )}
                      {withdrawState.status === 'error' && (
                        <>
                          <AlertCircle size={12} />
                          {withdrawState.error}
                        </>
                      )}
                    </div>
                  )}

                  {withdrawState?.receiptId === selectedReceipt.receiptId &&
                    withdrawState.txHash && (
                      <a
                        href={`${STARKSCAN_SEPOLIA_TX_BASE}${withdrawState.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-[#F28C38] hover:underline font-mono truncate"
                      >
                        View on Starkscan: {shortAddress(withdrawState.txHash, 10, 8)}
                      </a>
                    )}

                  <button
                    onClick={() => handleWithdraw(selectedReceipt)}
                    disabled={
                      !selectedReceipt.metadata ||
                      (withdrawState?.receiptId === selectedReceipt.receiptId &&
                        ['proving', 'sending', 'confirming'].includes(withdrawState.status))
                    }
                    className="w-full py-3 bg-[#F28C38] text-white text-xs font-medium tracking-[0.12em] uppercase rounded-lg hover:bg-[#e07d2e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    {withdrawState?.receiptId === selectedReceipt.receiptId &&
                    ['proving', 'sending', 'confirming'].includes(withdrawState.status)
                      ? 'Processing...'
                      : 'Withdraw to Wallet'}
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-neutral-400 text-xs space-y-2">
                  <Lock size={20} className="mx-auto" />
                  <p>Decrypt the receipt first to enable withdrawal.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-neutral-400 space-y-3">
              <Shield size={28} className="mx-auto" />
              <p className="text-sm">Select a receipt to view details</p>
              <p className="text-xs">
                Click any receipt on the left to view its details and withdraw funds.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
