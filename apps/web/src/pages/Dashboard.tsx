import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Shield, ArrowUpRight, History, RefreshCw, LogOut, ChevronRight } from 'lucide-react';
import { useAccount, useDisconnect, useNetwork } from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';
import { formatIsoDate, shortAddress, toAmountString } from '../lib/format';
import { loadPayrollHistory } from '../lib/payrollHistory';
import { STARKSCAN_SEPOLIA_TX_BASE } from '../lib/config';

function SummaryCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-4">{title}</h3>
      <div className="text-3xl font-medium tracking-tight mb-2">{value}</div>
      <div className="text-xs text-neutral-500">{subtitle}</div>
    </div>
  );
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const [refreshTick, setRefreshTick] = useState(0);

  const history = useMemo(() => loadPayrollHistory(), [refreshTick]);

  const successful = history.filter((entry) => entry.status === 'success');
  const totalSentUnits = successful.reduce((sum, entry) => sum + entry.totalAmountUnits, 0);
  const lastSuccess = successful[0];
  const recent = history.slice(0, 5);
  const isOnSepolia = chain.id === sepolia.id;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative">
      <div className="px-8 lg:px-16 xl:px-24 py-12 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center text-[10px] font-semibold tracking-[0.15em] mb-4 border border-neutral-200 dark:border-neutral-800 w-fit">
              <span className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">{shortAddress(address)}</span>
              <span className={`px-3 py-1.5 ${isConnected && isOnSepolia ? 'text-[#F28C38]' : 'text-red-500'}`}>
                {isConnected && isOnSepolia ? 'CONNECTED' : 'CHECK NETWORK'}
              </span>
            </div>
            <h1 className="text-4xl font-medium tracking-tight">Dashboard Overview</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setRefreshTick((value) => value + 1)} className="p-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500" title="Refresh Data">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => disconnect()} className="p-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500" title="Disconnect Wallet">
              <LogOut size={16} />
            </button>
            <Link to="/send" className="px-6 py-3 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex items-center gap-2">
              Send Money <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <SummaryCard
            title="Available Token Balance"
            value="N/A"
            subtitle=""
            icon={<Wallet size={48} />}
          />
          <SummaryCard
            title="Shielded Pool Balance"
            value="N/A"
            subtitle=""
            icon={<Shield size={48} />}
          />
          <SummaryCard
            title="Total Sent (Period)"
            value={`${toAmountString(totalSentUnits)} BTC`}
            subtitle=""
            icon={<ArrowUpRight size={48} />}
          />
          <SummaryCard
            title="Payroll Batches"
            value={String(successful.length)}
            subtitle={lastSuccess ? `Last successful: ${formatIsoDate(lastSuccess.createdAt)}` : 'No successful batches yet'}
            icon={<History size={48} />}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <h2 className="text-lg font-medium">Recent Activity</h2>
            <Link to="/history" className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#F28C38] hover:text-[#e07b27] transition-colors flex items-center gap-1">
              View Full History <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-2 px-4">
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Recipients</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Tx</div>
          </div>

          <div className="flex flex-col">
            {recent.length === 0 && (
              <div className="text-sm text-neutral-500 py-6 px-4">No payroll activity yet.</div>
            )}
            {recent.map((entry) => (
              <div key={entry.id} className="grid grid-cols-12 gap-4 text-sm items-center py-4 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors px-4 -mx-4">
                <div className="col-span-3 text-xs text-neutral-500">{formatIsoDate(entry.createdAt)}</div>
                <div className="col-span-2 font-medium">Send</div>
                <div className="col-span-2 font-mono text-xs">{entry.totalAmount} BTC</div>
                <div className="col-span-2 text-xs text-neutral-500">{entry.recipientCount}</div>
                <div className="col-span-1">
                  <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm ${entry.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : entry.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                    {entry.status}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  {entry.executeTxHash ? (
                    <a href={`${STARKSCAN_SEPOLIA_TX_BASE}${entry.executeTxHash}`} target="_blank" rel="noreferrer" className="text-[#F28C38] hover:underline text-xs font-mono">
                      {shortAddress(entry.executeTxHash, 8, 6)}
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
