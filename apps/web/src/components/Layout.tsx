import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
} from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { shortAddress } from '../lib/format';

export default function Layout() {
  const [isDark, setIsDark] = useState(true);
  const location = useLocation();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const preferredConnector = connectors.find((connector) => connector.id === 'braavos' && connector.available())
    ?? connectors.find((connector) => connector.id === 'argentX' && connector.available())
    ?? connectors.find((connector) => connector.available())
    ?? connectors[0];

  const isOnSepolia = chain.id === sepolia.id;

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  function connectWallet() {
    if (!preferredConnector) return;
    connect({ connector: preferredConnector });
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#000000] flex justify-center transition-colors duration-0">
      <div className="w-full max-w-[1536px] min-h-screen bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-white transition-colors duration-0 font-sans flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,0.08)] dark:shadow-[0_0_100px_rgba(255,255,255,0.03)] border-x border-neutral-200 dark:border-neutral-800">
        <header className="relative z-20 flex items-center justify-between px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a]">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="StarkPay" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-xl font-semibold tracking-tight">StarkPay</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-[11px] font-medium tracking-[0.15em] text-neutral-500 dark:text-neutral-400 uppercase">
            <Link to="/" className={`transition-colors ${location.pathname === '/' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>Home</Link>
            <Link to="/dashboard" className={`transition-colors ${location.pathname === '/dashboard' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>Dashboard</Link>
            <Link to="/send" className={`transition-colors ${location.pathname === '/send' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>Send</Link>
            <Link to="/history" className={`transition-colors ${location.pathname === '/history' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>History</Link>
            <Link to="/employee" className={`transition-colors ${location.pathname === '/employee' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>Employee</Link>
            <Link to="/mint" className={`transition-colors ${location.pathname === '/mint' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>Mint</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsDark((value) => !value)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {isConnected ? (
              <button onClick={() => disconnect()} className="px-4 py-2 text-[11px] font-medium tracking-[0.15em] uppercase border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                {shortAddress(address)}
              </button>
            ) : (
              <button onClick={connectWallet} disabled={isPending || !preferredConnector} className="px-4 py-2 text-[11px] font-medium tracking-[0.15em] uppercase border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isPending ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
            {isConnected && !isOnSepolia && (
              <span className="text-[10px] tracking-[0.12em] uppercase text-red-500">Wrong network</span>
            )}
          </div>
        </header>

        <div className="h-8 border-b border-neutral-200 dark:border-neutral-800 bg-pattern w-full relative z-10"></div>

        <main className={`relative z-10 flex flex-1 ${location.pathname === '/' ? 'flex-col' : 'flex-col lg:flex-row'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
