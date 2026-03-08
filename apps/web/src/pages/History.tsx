import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, ArrowUpRight, History as HistoryIcon, ChevronLeft, Shield, Lock, ExternalLink, CheckCircle } from 'lucide-react';

function HistoryRow({ date, type, amount, recipient, status, hash }: { date: string, type: string, amount: string, recipient: string, status: 'success' | 'pending' | 'failed', hash: string }) {
  return (
    <div className="grid grid-cols-12 gap-4 text-sm items-center py-4 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors px-4 -mx-4 cursor-pointer">
      <div className="col-span-2 text-neutral-500 text-xs">{date}</div>
      <div className="col-span-2 flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${type === 'Send' ? 'bg-orange-50 dark:bg-orange-900/20 text-[#F28C38]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
          {type === 'Send' ? <ArrowUpRight size={12} /> : <HistoryIcon size={12} />}
        </div>
        <span className="font-medium text-xs">{type}</span>
      </div>
      <div className="col-span-2 font-mono text-xs">{amount}</div>
      <div className="col-span-3 font-mono text-neutral-600 dark:text-neutral-300 text-xs truncate pr-2" title={recipient}>{recipient}</div>
      <div className="col-span-1">
        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm ${status === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
          {status}
        </span>
      </div>
      <div className="col-span-2 flex justify-end">
        <a href="#" className="text-[#F28C38] hover:text-[#e07b27] transition-colors flex items-center gap-1 text-xs font-medium">
          {hash} <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

export default function History() {
  const [selectedTx, setSelectedTx] = useState<boolean>(false);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative">
      <div className="px-8 lg:px-16 xl:px-24 py-12 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500 rounded-full">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="text-4xl font-medium tracking-tight">History & Withdraw</h1>
          </div>
          <button className="px-6 py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: History & Filters */}
          <div className="lg:col-span-2 flex flex-col h-full">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input type="text" placeholder="Search Tx Hash / Receipt ID" className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 pl-9 pr-4 text-xs outline-none focus:border-[#F28C38] transition-colors" />
              </div>
              <div className="relative w-40">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <select className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 pl-9 pr-4 text-xs outline-none focus:border-[#F28C38] transition-colors appearance-none cursor-pointer">
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-800 rounded-sm px-3 py-1.5">
                <input type="date" className="bg-transparent text-xs font-medium outline-none text-neutral-600 dark:text-neutral-300" />
                <span className="text-neutral-400 text-xs">-</span>
                <input type="date" className="bg-transparent text-xs font-medium outline-none text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-semibold transition-colors tracking-[0.15em] text-[10px] uppercase">
                  Apply
                </button>
                <button className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[10px] uppercase text-neutral-500">
                  Reset
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 px-4">
              <div className="col-span-2">Date/Time</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-3">Recipient/Dest</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Tx Hash</div>
            </div>
            
            {/* Table Body */}
            <div className="flex-1 overflow-y-auto min-h-[400px]">
              <div onClick={() => setSelectedTx(true)}>
                <HistoryRow date="Oct 28, 14:30" type="Send" amount="4.25 BTC" recipient="Batch (3 recipients)" status="success" hash="0x1a2b...3c4d" />
              </div>
              <HistoryRow date="Oct 15, 09:15" type="Send" amount="1.10 BTC" recipient="0x049d...3e2f" status="success" hash="0x5e6f...7g8h" />
              <HistoryRow date="Oct 10, 11:45" type="Withdraw" amount="0.50 BTC" recipient="0x9i0j...1k2l" status="success" hash="0x3m4n...5o6p" />
              <HistoryRow date="Oct 01, 16:20" type="Send" amount="3.15 BTC" recipient="Batch (12 recipients)" status="success" hash="0x7q8r...9s0t" />
              <HistoryRow date="Sep 28, 10:05" type="Send" amount="0.80 BTC" recipient="0x028a...9b1c" status="pending" hash="0x1u2v...3w4x" />
              <HistoryRow date="Sep 25, 15:00" type="Send" amount="2.00 BTC" recipient="Batch (5 recipients)" status="failed" hash="0x5y6z...7a8b" />
            </div>
          </div>

          {/* Right Column: Withdraw Panel & Details */}
          <div className="lg:col-span-1 space-y-8">
            {/* Withdraw Panel */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-6 bg-neutral-50/50 dark:bg-[#111111]/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Shield size={64} />
              </div>
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Lock size={14} /> Shielded Pool Withdraw
              </h3>
              
              <div className="mb-6">
                <div className="text-xs text-neutral-500 mb-1 uppercase tracking-widest font-bold">Available Balance</div>
                <div className="text-3xl font-medium tracking-tight">4.20 BTC</div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-500">Withdraw Amount *</label>
                    <button className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#F28C38] hover:text-[#e07b27] transition-colors">Max</button>
                  </div>
                  <input type="number" placeholder="0.00" className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors relative z-10" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Destination Address *</label>
                  <input type="text" placeholder="0x..." className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors relative z-10" />
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <button className="w-full py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex justify-center items-center gap-2">
                  <Shield size={14} /> Generate Proof
                </button>
                <button className="w-full py-3 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                  Withdraw Funds
                </button>
              </div>

              {/* Status */}
              <div className="mt-4 p-3 bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 flex items-center gap-2 relative z-10">
                <CheckCircle size={14} className="text-green-500" />
                Proof generated successfully. Ready to submit.
              </div>
            </div>

            {/* Transaction Details Panel (Conditional) */}
            {selectedTx && (
              <div className="border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase">Transaction Details</h3>
                  <button onClick={() => setSelectedTx(false)} className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Close</button>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Status</span>
                    <span className="font-medium text-green-600 dark:text-green-400">Success</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Type</span>
                    <span className="font-medium">Batch Send</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Amount</span>
                    <span className="font-medium">4.25 BTC</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Recipients</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Date</span>
                    <span className="font-medium">Oct 28, 2023 14:30</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
                    <span className="text-neutral-500">Gas Used</span>
                    <span className="font-medium">0.0001 BTC</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-neutral-500 block mb-1">Transaction Hash</span>
                    <a href="#" className="font-mono text-xs text-[#F28C38] hover:underline break-all">
                      0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
