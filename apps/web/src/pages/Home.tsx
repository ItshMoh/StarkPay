import { Link } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Users,
  PlayCircle,
  Shield,
  FileText,
  HelpCircle,
  Settings,
  ArrowRight,
  CircleAlert,
} from 'lucide-react';
import {
  useAccount,
  useConnect,
  useNetwork,
  useSwitchChain,
} from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';
import { num } from 'starknet';
import { shortAddress } from '../lib/format';
import ProblemCards from '../components/home/ProblemCards';
import HowItWorks from '../components/home/HowItWorks';
import TechStackBar from '../components/home/TechStackBar';

function MockupNavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
        active
          ? 'bg-white dark:bg-[#1a1a1a] text-neutral-900 dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-800 relative'
          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-[#1a1a1a] hover:text-neutral-900 dark:hover:text-white'
      }`}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#F28C38] rounded-r-full"></div>
      )}
      <span className={active ? 'text-[#F28C38]' : ''}>{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export default function Home() {
  const { connect, connectors, error, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain({});
  const preferredConnector = connectors.find((connector) => connector.id === 'braavos' && connector.available())
    ?? connectors.find((connector) => connector.id === 'argentX' && connector.available())
    ?? connectors.find((connector) => connector.available())
    ?? connectors[0];

  const isOnSepolia = chain.id === sepolia.id;
  const canContinue = isConnected && isOnSepolia;

  function handleConnectWallet() {
    if (!preferredConnector) return;
    connect({ connector: preferredConnector });
  }

  function handleSwitchToSepolia() {
    switchChain({ chainId: num.toHex(sepolia.id) });
  }

  return (
    <div className="flex flex-col w-full">
      {/* Viewport 1: Hero (existing home page) */}
      <div className="min-h-screen flex flex-col lg:flex-row w-full">
        {/* Left Column */}
        <div className="relative flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-16 lg:py-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a]">
          <div className="absolute top-[-3px] -right-[3px] w-[5px] h-[5px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#0a0a0a] z-30 hidden lg:block"></div>

          <div className="max-w-xl">
            {/* Badge */}
            <div className="flex items-center text-[10px] font-semibold tracking-[0.15em] mb-8 border border-neutral-200 dark:border-neutral-800 w-fit">
              <span className="px-3 py-1.5 bg-[#F28C38] text-white">MVP</span>
              <span className="px-3 py-1.5 text-neutral-600 dark:text-neutral-300">STARKNET SEPOLIA</span>
            </div>

            <h1 className="text-6xl lg:text-[76px] font-medium tracking-[-0.03em] leading-[1.05] mb-6">
              On-Chain Payroll
              <br />
              <span className="text-neutral-400 dark:text-neutral-500">Zero-Knowledge</span>
            </h1>

            <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed max-w-md font-light">
              Run batch salary payments in BTC-denominated test tokens while protecting employee privacy through a custom ZK shielded pool.
            </p>

            <div className="border border-neutral-200 dark:border-neutral-800 p-5 mb-8 bg-neutral-50/40 dark:bg-[#111111]/50">
              <h2 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-4">
                Wallet / Network Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-neutral-500 mb-1">Wallet</div>
                  <div className="font-mono">{shortAddress(address)}</div>
                </div>
                <div>
                  <div className="text-neutral-500 mb-1">Network</div>
                  <div>{chain.name}</div>
                </div>
                <div>
                  <div className="text-neutral-500 mb-1">Status</div>
                  <div
                    className={
                      canContinue
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }
                  >
                    {canContinue ? 'Ready' : 'Action required'}
                  </div>
                </div>
              </div>
              {(error || switchError) && (
                <div className="mt-4 flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
                  <CircleAlert size={14} className="mt-0.5" />
                  <span>{error?.message || switchError?.message}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-12">
              <button
                onClick={handleConnectWallet}
                disabled={isConnected || isPending || !preferredConnector}
                className="px-8 py-4 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Connecting...' : 'Connect Wallet'}
              </button>

              {!isOnSepolia && isConnected && (
                <button
                  onClick={handleSwitchToSepolia}
                  disabled={isSwitching}
                  className="px-8 py-4 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase disabled:opacity-50"
                >
                  {isSwitching ? 'Switching...' : 'Switch to Starknet Sepolia'}
                </button>
              )}

              <Link
                to="/dashboard"
                className={`px-8 py-4 border border-neutral-200 dark:border-neutral-800 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex items-center gap-2 ${
                  canContinue
                    ? 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    : 'pointer-events-none opacity-50'
                }`}
              >
                Continue to Dashboard <ArrowRight size={14} />
              </Link>
            </div>

          </div>
        </div>

        {/* Right Column - App Mockup */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-[#0f0f0f] dark:to-[#141414] flex items-center justify-center p-8 lg:p-12">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-[#111111] rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-neutral-100 dark:border-neutral-800 flex overflow-hidden aspect-[16/10] transform transition-transform hover:scale-[1.02] duration-500">
            {/* Mockup Sidebar */}
            <div className="w-64 border-r border-neutral-100 dark:border-neutral-800 p-6 flex flex-col bg-neutral-50/50 dark:bg-[#0a0a0a]/50">
              <div className="font-semibold mb-8 text-sm">StarkPay MVP</div>

              <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-md py-2 pl-9 pr-4 text-xs outline-none focus:border-[#F28C38] transition-colors"
                />
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
                    <div className="text-sm font-medium">{isConnected ? shortAddress(address) : 'Not Connected'}</div>
                    <div className="text-xs text-neutral-500">
                      {isOnSepolia ? 'Starknet Sepolia ready' : 'Switch to Starknet Sepolia'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                    <LayoutDashboard size={24} />
                  </div>
                  <h3 className="text-sm font-medium mb-2">Ready to run payroll?</h3>
                  <p className="text-xs text-neutral-500 max-w-[220px] mx-auto">
                    Validate recipients, preview batch totals, then execute queue and dispatch transactions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Problem Statement */}
      <ProblemCards />

      {/* Section 3: How It Works */}
      <HowItWorks />

      {/* Section 4: Tech Stack Bar */}
      <TechStackBar />
    </div>
  );
}
