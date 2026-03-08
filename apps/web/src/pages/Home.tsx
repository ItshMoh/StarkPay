import React from 'react';
import { Search, LayoutDashboard, Users, PlayCircle, Shield, FileText, HelpCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

function MockupNavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${active ? 'bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-800 relative' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-[#1a1a1a] hover:text-neutral-900 dark:hover:text-white'}`}>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#F28C38] rounded-r-full"></div>}
      <span className={active ? 'text-[#F28C38]' : ''}>{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* Left Column */}
      <div className="relative flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-16 lg:py-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a]">
        {/* Middle Line Nodes */}
        <div className="absolute top-[-3px] -right-[3px] w-[5px] h-[5px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#0a0a0a] z-30 hidden lg:block"></div>
        
        <div className="max-w-xl">
          {/* Badge */}
          <div className="flex items-center text-[10px] font-semibold tracking-[0.15em] mb-8 border border-neutral-200 dark:border-neutral-800 w-fit">
            <span className="px-3 py-1.5 bg-[#F28C38] text-white">MVP</span>
            <span className="px-3 py-1.5 text-neutral-600 dark:text-neutral-300">STARKNET SEPOLIA</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-6xl lg:text-[76px] font-medium tracking-[-0.03em] leading-[1.05] mb-6">
            On-Chain Payroll<br />
            <span className="text-neutral-400 dark:text-neutral-500">Zero-Knowledge</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-12 leading-relaxed max-w-md font-light">
            Run batch salary payments in BTC-denominated test tokens while protecting employee privacy through a custom ZK shielded pool.
          </p>
          
          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-24">
            <button className="px-8 py-4 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase">
              Connect Wallet
            </button>
            <Link to="/dashboard" className="px-8 py-4 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase">
              Continue to Dashboard
            </Link>
          </div>

          {/* Logos */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-6 tracking-[0.1em] uppercase">Powered by leading technologies</p>
            <div className="flex items-center gap-12 opacity-60 grayscale">
              <div className="text-2xl font-bold font-serif tracking-tight">Starknet</div>
              <div className="text-2xl font-bold flex items-center gap-1"><span className="text-3xl leading-none">*</span> Cairo</div>
              <div className="text-2xl font-bold tracking-tighter">ZK-STARKs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - App Mockup */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-[#0f0f0f] dark:to-[#141414] flex items-center justify-center p-8 lg:p-12">
        {/* Abstract background shapes */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-3xl"></div>
        
        {/* Mockup */}
        <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-[#111111] rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-neutral-100 dark:border-neutral-800 flex overflow-hidden aspect-[16/10] transform transition-transform hover:scale-[1.02] duration-500">
          
          {/* Mockup Sidebar */}
          <div className="w-64 border-r border-neutral-100 dark:border-neutral-800 p-6 flex flex-col bg-neutral-50/50 dark:bg-[#0a0a0a]/50">
            <div className="font-semibold mb-8 text-sm">StarkPay MVP</div>
            
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              <input type="text" placeholder="Search..." className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-md py-2 pl-9 pr-4 text-xs outline-none focus:border-[#F28C38] transition-colors" />
            </div>

            <div className="space-y-1 flex-1">
              <MockupNavItem icon={<LayoutDashboard size={16} />} label="Dashboard" />
              <MockupNavItem icon={<Users size={16} />} label="Employees" />
              <MockupNavItem icon={<PlayCircle size={16} />} label="Run Payroll" active />
              <MockupNavItem icon={<Shield size={16} />} label="Shielded Pool" />
              <MockupNavItem icon={<FileText size={16} />} label="Transactions" />
            </div>

            <div className="space-y-1 mt-auto pt-8 border-t border-neutral-100 dark:border-neutral-800">
              <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 mb-4 tracking-widest uppercase">Others</div>
              <MockupNavItem icon={<HelpCircle size={16} />} label="Help Center" />
              <MockupNavItem icon={<Settings size={16} />} label="Settings" />
            </div>
          </div>

          {/* Mockup Main */}
          <div className="flex-1 p-8 flex flex-col bg-white dark:bg-[#111111]">
            <h2 className="text-xl font-medium mb-6">Wallet Status</h2>
            
            <div className="bg-neutral-50 dark:bg-[#141414] border border-neutral-100 dark:border-neutral-800 rounded-md p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-[#F28C38]">
                  <Shield size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium">Not Connected</div>
                  <div className="text-xs text-neutral-500">Please connect your Starknet wallet</div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                  <LayoutDashboard size={24} />
                </div>
                <h3 className="text-sm font-medium mb-2">Ready to run payroll?</h3>
                <p className="text-xs text-neutral-500 max-w-[200px] mx-auto">Connect your wallet to access the dashboard and execute batch payments.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
