import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Coins, CheckCircle, AlertCircle, LoaderCircle, ExternalLink } from 'lucide-react';
import {
  useAccount,
  useNetwork,
  useSendTransaction,
} from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';
import { TBTC_TOKEN_ADDRESS, STARKSCAN_SEPOLIA_TX_BASE } from '../lib/config';
import { shortAddress } from '../lib/format';

type MintStatus = 'idle' | 'sending' | 'confirming' | 'success' | 'error';

export default function Mint() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { sendAsync } = useSendTransaction({});

  const isOnSepolia = chain.id === sepolia.id;

  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<MintStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    { label: '1 spBTC', value: '1' },
    { label: '10 spBTC', value: '10' },
    { label: '100 spBTC', value: '100' },
    { label: '1000 spBTC', value: '1000' },
  ];

  async function handleMint() {
    if (!address || !amount) return;

    setStatus('sending');
    setTxHash(null);
    setError(null);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      // Token has 6 decimals
      const rawAmount = BigInt(Math.floor(parsedAmount * 1_000_000));

      const response = await sendAsync([
        {
          contractAddress: TBTC_TOKEN_ADDRESS,
          entrypoint: 'mint',
          calldata: [
            address,
            `0x${rawAmount.toString(16)}`,
            '0x0', // u256 high part
          ],
        },
      ]);

      setTxHash(response.transaction_hash);
      setStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mint failed');
      setStatus('error');
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative">
      <div className="px-8 lg:px-16 xl:px-24 py-12 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
          <Link to="/dashboard" className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500 rounded-full">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-4xl font-medium tracking-tight">Mint spBTC</h1>
        </div>

        {/* Info card */}
        <div className="border border-neutral-200 dark:border-neutral-800 p-6 mb-8 bg-neutral-50/40 dark:bg-[#111111]/50">
          <div className="flex items-start gap-3">
            <Coins size={20} className="text-[#F28C38] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold mb-2">Testnet Token Faucet</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                spBTC is the test token used for payroll on StarkPay. Mint tokens to your connected wallet for free on Starknet Sepolia. These tokens have no real value.
              </p>
              <div className="mt-3 text-xs font-mono text-neutral-400 dark:text-neutral-500 break-all">
                Token: {shortAddress(TBTC_TOKEN_ADDRESS, 10, 8)}
              </div>
            </div>
          </div>
        </div>

        {/* Wallet status */}
        <div className="border border-neutral-200 dark:border-neutral-800 p-5 mb-8">
          <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-4">
            Wallet Status
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-neutral-500 mb-1">Wallet</div>
              <div className="font-mono text-xs">{isConnected ? shortAddress(address) : 'Not connected'}</div>
            </div>
            <div>
              <div className="text-neutral-500 mb-1">Network</div>
              <div className={isOnSepolia ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                {isOnSepolia ? 'Starknet Sepolia' : 'Wrong network'}
              </div>
            </div>
          </div>
        </div>

        {/* Mint form */}
        <div className="border border-neutral-200 dark:border-neutral-800 p-6">
          <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-6">
            Mint Tokens
          </h3>

          {/* Preset amounts */}
          <div className="flex flex-wrap gap-2 mb-6">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setAmount(preset.value)}
                className={`px-4 py-2 border text-xs font-semibold tracking-[0.1em] uppercase transition-colors ${
                  amount === preset.value
                    ? 'border-[#F28C38] bg-[#F28C38]/10 text-[#F28C38]'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Amount (spBTC)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-sm py-3 px-4 text-sm outline-none focus:border-[#F28C38] transition-colors font-mono"
            />
          </div>

          {/* Mint button */}
          <button
            onClick={handleMint}
            disabled={!isConnected || !isOnSepolia || !amount || status === 'sending'}
            className="w-full py-4 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'sending' ? (
              <>
                <LoaderCircle size={14} className="animate-spin" /> Minting...
              </>
            ) : (
              <>
                <Coins size={14} /> Mint spBTC
              </>
            )}
          </button>

          {/* Status messages */}
          {status === 'success' && txHash && (
            <div className="mt-4 p-4 border border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10 flex items-start gap-3">
              <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Tokens minted successfully</div>
                <a
                  href={`${STARKSCAN_SEPOLIA_TX_BASE}${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-[#F28C38] hover:underline flex items-center gap-1"
                >
                  {shortAddress(txHash, 10, 8)} <ExternalLink size={10} />
                </a>
              </div>
            </div>
          )}

          {status === 'error' && error && (
            <div className="mt-4 p-4 border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            </div>
          )}

          {!isConnected && (
            <div className="mt-4 p-3 border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10 text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <AlertCircle size={14} /> Connect your wallet first to mint tokens.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
