import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Moon, Sun } from 'lucide-react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = (e: React.MouseEvent) => {
    const doc = document as any;
    if (!doc.startViewTransition) {
      setIsDark(!isDark);
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        setIsDark(!isDark);
      });
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      document.documentElement.animate(
        {
          clipPath: isDark ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: 600,
          easing: 'ease-in-out',
          pseudoElement: isDark
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)',
        }
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#000000] flex justify-center transition-colors duration-0">
      <div className="w-full max-w-[1536px] min-h-screen bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-white transition-colors duration-0 font-sans flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,0.08)] dark:shadow-[0_0_100px_rgba(255,255,255,0.03)] border-x border-neutral-200 dark:border-neutral-800">
      
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a]">
        {/* Decorative Nodes */}
        <div className="absolute top-[-1px] -left-[3px] w-[5px] h-[5px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#0a0a0a] z-30"></div>
        <div className="absolute top-[-1px] -right-[3px] w-[5px] h-[5px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#0a0a0a] z-30"></div>
        <div className="absolute -bottom-[3px] -left-[3px] w-[5px] h-[5px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#0a0a0a] z-30"></div>
        <div className="absolute -bottom-[3px] -right-[3px] w-[5px] h-[5px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#0a0a0a] z-30"></div>

        <Link to="/" className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-[3px] border-[#F28C38] border-t-transparent rotate-45"></div>
          <span className="text-xl font-semibold tracking-tight">StarkPay</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-10 text-[11px] font-medium tracking-[0.15em] text-neutral-500 dark:text-neutral-400 uppercase">
          <Link to="/" className={`transition-colors ${location.pathname === '/' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>Home</Link>
          <Link to="/dashboard" className={`transition-colors ${location.pathname === '/dashboard' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>Dashboard</Link>
          <Link to="/send" className={`transition-colors ${location.pathname === '/send' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>Send</Link>
          <Link to="/history" className={`transition-colors ${location.pathname === '/history' ? 'text-neutral-900 dark:text-white' : 'hover:text-neutral-900 dark:hover:text-white'}`}>History</Link>
        </nav>

        <div className="flex items-center gap-8">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="px-8 py-3 text-[11px] font-medium tracking-[0.2em] uppercase border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
            Connect Wallet
          </button>
        </div>
      </header>

      {/* Pattern Strip */}
      <div className="h-8 border-b border-neutral-200 dark:border-neutral-800 bg-pattern w-full relative z-10">
        <div className="absolute -bottom-[3px] -left-[3px] w-[5px] h-[5px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#0a0a0a] z-30"></div>
        <div className="absolute -bottom-[3px] -right-[3px] w-[5px] h-[5px] border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#0a0a0a] z-30"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col lg:flex-row flex-1">
        <Outlet />
      </main>
      </div>
    </div>
  );
}
