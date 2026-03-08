import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Shield, ArrowUpRight, History, RefreshCw, LogOut, Calendar, ChevronRight } from 'lucide-react';

function SummaryCard({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
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

function TransactionRow({ type, amount, date, status }: { type: string, amount: string, date: string, status: 'success' | 'pending' }) {
  return (
    <div className="grid grid-cols-12 gap-4 text-sm items-center py-4 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-[#111111] transition-colors px-4 -mx-4">
      <div className="col-span-4 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${type === 'Send' ? 'bg-orange-50 dark:bg-orange-900/20 text-[#F28C38]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
          {type === 'Send' ? <ArrowUpRight size={14} /> : <History size={14} />}
        </div>
        <span className="font-medium">{type}</span>
      </div>
      <div className="col-span-3 font-mono text-xs">{amount}</div>
      <div className="col-span-3 text-neutral-500 text-xs">{date}</div>
      <div className="col-span-2 text-right">
        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm ${status === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative">
      {/* Middle Line Nodes (if needed, but usually on the border) */}
      
      <div className="px-8 lg:px-16 xl:px-24 py-12 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center text-[10px] font-semibold tracking-[0.15em] mb-4 border border-neutral-200 dark:border-neutral-800 w-fit">
              <span className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">0x049d...3e2f</span>
              <span className="px-3 py-1.5 text-[#F28C38]">CONNECTED</span>
            </div>
            <h1 className="text-4xl font-medium tracking-tight">Dashboard Overview</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500" title="Refresh Data">
              <RefreshCw size={16} />
            </button>
            <button className="p-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500" title="Disconnect Wallet">
              <LogOut size={16} />
            </button>
            <Link to="/send" className="px-6 py-3 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex items-center gap-2">
              Send Money <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-4 mb-8 p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111111]/50 w-fit">
          <Calendar size={16} className="text-neutral-400" />
          <div className="flex items-center gap-2">
            <input type="date" className="bg-transparent text-xs font-medium outline-none text-neutral-600 dark:text-neutral-300" defaultValue="2023-10-01" />
            <span className="text-neutral-400 text-xs">to</span>
            <input type="date" className="bg-transparent text-xs font-medium outline-none text-neutral-600 dark:text-neutral-300" defaultValue="2023-10-31" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <SummaryCard 
            title="Available Token Balance" 
            value="12.45 BTC" 
            subtitle="Starknet Sepolia" 
            icon={<Wallet size={48} />} 
          />
          <SummaryCard 
            title="Shielded Pool Balance" 
            value="4.20 BTC" 
            subtitle="Private Funds" 
            icon={<Shield size={48} />} 
          />
          <SummaryCard 
            title="Total Sent (Period)" 
            value="8.50 BTC" 
            subtitle="Oct 1 - Oct 31" 
            icon={<ArrowUpRight size={48} />} 
          />
          <SummaryCard 
            title="Payroll Batches" 
            value="3" 
            subtitle="Last successful: 2 days ago" 
            icon={<History size={48} />} 
          />
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <h2 className="text-lg font-medium">Recent Activity</h2>
            <Link to="/history" className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#F28C38] hover:text-[#e07b27] transition-colors flex items-center gap-1">
              View Full History <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-2 px-4">
            <div className="col-span-4">Type</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          
          <div className="flex flex-col">
            <TransactionRow type="Send" amount="4.25 BTC" date="Oct 28, 2023 14:30" status="success" />
            <TransactionRow type="Send" amount="1.10 BTC" date="Oct 15, 2023 09:15" status="success" />
            <TransactionRow type="Withdraw" amount="0.50 BTC" date="Oct 10, 2023 11:45" status="success" />
            <TransactionRow type="Send" amount="3.15 BTC" date="Oct 01, 2023 16:20" status="success" />
            <TransactionRow type="Send" amount="0.80 BTC" date="Sep 28, 2023 10:05" status="pending" />
          </div>
        </div>
      </div>
    </div>
  );
}
