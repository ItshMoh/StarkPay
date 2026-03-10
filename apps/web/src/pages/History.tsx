import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, ArrowUpRight, ChevronLeft, Shield, Lock, ExternalLink, CheckCircle } from 'lucide-react';
import { formatIsoDate, shortAddress } from '../lib/format';
import { loadPayrollHistory } from '../lib/payrollHistory';
import type { PayrollHistoryEntry, PayrollTxStatus } from '../lib/payrollHistory';
import { STARKSCAN_SEPOLIA_TX_BASE } from '../lib/config';

function rowMatchesFilters(
  row: PayrollHistoryEntry,
  query: string,
  status: 'all' | PayrollTxStatus,
  fromDate: string,
  toDate: string,
): boolean {
  const lowerQuery = query.trim().toLowerCase();
  if (lowerQuery) {
    const haystack = [
      row.batchId ?? '',
      row.queueTxHash ?? '',
      row.executeTxHash ?? '',
      row.totalAmount,
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(lowerQuery)) {
      return false;
    }
  }

  if (status !== 'all' && row.status !== status) {
    return false;
  }

  const rowDate = new Date(row.createdAt);
  if (fromDate) {
    const from = new Date(`${fromDate}T00:00:00`);
    if (rowDate < from) return false;
  }
  if (toDate) {
    const to = new Date(`${toDate}T23:59:59`);
    if (rowDate > to) return false;
  }

  return true;
}

export default function History() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | PayrollTxStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [withdrawStatus, setWithdrawStatus] = useState('Idle');

  const history = useMemo(() => loadPayrollHistory(), []);
  const filtered = history.filter((row) => rowMatchesFilters(row, query, status, fromDate, toDate));
  const selectedTx = filtered.find((row) => row.id === selectedTxId) ?? null;

  function resetFilters() {
    setQuery('');
    setStatus('all');
    setFromDate('');
    setToDate('');
  }

  function exportFilteredCsv() {
    const csv = [
      'created_at,status,total_amount,recipient_count,batch_id,queue_tx_hash,execute_tx_hash,error',
      ...filtered.map((row) =>
        [
          row.createdAt,
          row.status,
          row.totalAmount,
          row.recipientCount,
          row.batchId ?? '',
          row.queueTxHash ?? '',
          row.executeTxHash ?? '',
          row.error ?? '',
        ]
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payroll-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function mockGenerateWithdrawProof() {
    setWithdrawStatus('Proof generated successfully');
  }

  function mockWithdraw() {
    if (!withdrawAmount || !destinationAddress) {
      setWithdrawStatus('Withdraw amount and destination are required');
      return;
    }
    setWithdrawStatus('Withdraw submitted (mock for phase 6)');
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative">
      <div className="px-8 lg:px-16 xl:px-24 py-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500 rounded-full">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="text-4xl font-medium tracking-tight">History & Withdraw</h1>
          </div>
          <button onClick={exportFilteredCsv} className="px-6 py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="text" placeholder="Search Tx Hash / Batch ID" className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 pl-9 pr-4 text-xs outline-none focus:border-[#F28C38] transition-colors" />
              </div>
              <div className="relative w-40">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | PayrollTxStatus)} className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 pl-9 pr-4 text-xs outline-none focus:border-[#F28C38] transition-colors appearance-none cursor-pointer">
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-800 rounded-sm px-3 py-1.5">
                <input value={fromDate} onChange={(event) => setFromDate(event.target.value)} type="date" className="bg-transparent text-xs font-medium outline-none text-neutral-600 dark:text-neutral-300" />
                <span className="text-neutral-400 text-xs">-</span>
                <input value={toDate} onChange={(event) => setToDate(event.target.value)} type="date" className="bg-transparent text-xs font-medium outline-none text-neutral-600 dark:text-neutral-300" />
              </div>
              <button className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-semibold transition-colors tracking-[0.15em] text-[10px] uppercase">
                Apply
              </button>
              <button onClick={resetFilters} className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[10px] uppercase text-neutral-500">
                Reset
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 px-4">
              <div className="col-span-3">Date/Time</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Recipients</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Tx Hash</div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[400px]">
              {filtered.length === 0 && (
                <div className="text-sm text-neutral-500 py-6 px-4">No history rows matched your filters.</div>
              )}

              {filtered.map((row) => (
                <button key={row.id} onClick={() => setSelectedTxId(row.id)} className="w-full text-left grid grid-cols-12 gap-4 text-sm items-center py-4 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors px-4 -mx-4 cursor-pointer">
                  <div className="col-span-3 text-neutral-500 text-xs">{formatIsoDate(row.createdAt)}</div>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-orange-50 dark:bg-orange-900/20 text-[#F28C38]">
                      <ArrowUpRight size={12} />
                    </div>
                    <span className="font-medium text-xs">Send</span>
                  </div>
                  <div className="col-span-2 font-mono text-xs">{row.totalAmount} BTC</div>
                  <div className="col-span-2 text-xs text-neutral-500">{row.recipientCount}</div>
                  <div className="col-span-1">
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm ${row.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : row.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {row.executeTxHash ? (
                      <a href={`${STARKSCAN_SEPOLIA_TX_BASE}${row.executeTxHash}`} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer" className="text-[#F28C38] hover:text-[#e07b27] transition-colors flex items-center gap-1 text-xs font-medium">
                        {shortAddress(row.executeTxHash, 10, 8)} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-400">-</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <div className="border border-neutral-200 dark:border-neutral-800 p-6 bg-neutral-50/50 dark:bg-[#111111]/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Shield size={64} />
              </div>
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Lock size={14} /> Shielded Pool Withdraw
              </h3>

              <div className="mb-6">
                <div className="text-xs text-neutral-500 mb-1 uppercase tracking-widest font-bold">Available Balance</div>
                <div className="text-3xl font-medium tracking-tight">N/A</div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-500">Withdraw Amount *</label>
                    <button onClick={() => setWithdrawAmount('0.00')} className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#F28C38] hover:text-[#e07b27] transition-colors">Max</button>
                  </div>
                  <input value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} type="text" placeholder="0.00" className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors relative z-10" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Destination Address *</label>
                  <input value={destinationAddress} onChange={(event) => setDestinationAddress(event.target.value)} type="text" placeholder="0x..." className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors relative z-10" />
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <button onClick={mockGenerateWithdrawProof} className="w-full py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex justify-center items-center gap-2">
                  <Shield size={14} /> Generate Proof
                </button>
                <button onClick={mockWithdraw} className="w-full py-3 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase">
                  Withdraw Funds
                </button>
              </div>

              <div className="mt-4 p-3 bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 flex items-center gap-2 relative z-10">
                <CheckCircle size={14} className="text-green-500" />
                {withdrawStatus}
              </div>
            </div>

            {selectedTx && (
              <div className="border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase">Transaction Details</h3>
                  <button onClick={() => setSelectedTxId(null)} className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Close</button>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Status</span>
                    <span className="font-medium">{selectedTx.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Type</span>
                    <span className="font-medium">Batch Send</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Amount</span>
                    <span className="font-medium">{selectedTx.totalAmount} BTC</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Recipients</span>
                    <span className="font-medium">{selectedTx.recipientCount}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Date</span>
                    <span className="font-medium">{formatIsoDate(selectedTx.createdAt)}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-neutral-500 block mb-1">Execute Transaction Hash</span>
                    {selectedTx.executeTxHash ? (
                      <a href={`${STARKSCAN_SEPOLIA_TX_BASE}${selectedTx.executeTxHash}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-[#F28C38] hover:underline break-all">
                        {selectedTx.executeTxHash}
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-400">N/A</span>
                    )}
                  </div>
                  {selectedTx.error && (
                    <div className="pt-2">
                      <span className="text-neutral-500 block mb-1">Error</span>
                      <span className="text-xs text-red-500 break-all">{selectedTx.error}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
