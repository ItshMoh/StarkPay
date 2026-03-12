export default function ProblemCards() {
  return (
    <section className="bg-[#050505] text-white py-24 px-8 lg:px-16 xl:px-24 border-b border-neutral-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 text-[#F28C38] text-[10px] tracking-[0.2em] font-mono uppercase">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#F28C38]"></div>
            <span>The Problem</span>
          </div>
          <a href="#how-it-works" className="hover:text-white transition-colors">Learn More</a>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-neutral-800 border border-neutral-800">

          {/* Card 1 */}
          <div className="flex flex-col bg-[#050505] group cursor-pointer h-[500px]">
            {/* Top */}
            <div className="h-1/2 bg-[#D96B27] relative overflow-hidden p-8">
              <h3 className="text-6xl lg:text-[80px] font-bold text-black/10 leading-none tracking-tighter">PUBLIC</h3>
              <svg className="absolute bottom-[-20%] right-[-20%] w-[120%] h-[120%] opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <circle cx="80" cy="100" r="30" fill="none" stroke="black" strokeWidth="0.5" />
                <circle cx="80" cy="100" r="50" fill="none" stroke="black" strokeWidth="0.5" />
                <circle cx="80" cy="100" r="70" fill="none" stroke="black" strokeWidth="0.5" />
              </svg>
            </div>
            {/* Bottom */}
            <div className="h-1/2 relative flex flex-col items-center pt-12 overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center pt-12 transition-opacity duration-500 group-hover:opacity-0">
                <span className="text-[#D96B27] text-xs font-mono mb-8">01</span>
                <span className="text-neutral-400 tracking-[0.3em] text-sm uppercase" style={{ writingMode: 'vertical-rl' }}>Salary Transparency</span>
              </div>
              <div className="absolute inset-0 p-8 flex flex-col justify-center opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[#0a0a0a]">
                <span className="text-[#D96B27] text-xs font-mono mb-4">01 // SALARY TRANSPARENCY</span>
                <p className="text-neutral-400 text-sm leading-relaxed">On-chain payments expose exactly how much each employee earns. Anyone with a block explorer can see every transfer — amount, sender, receiver. Your entire payroll is public.</p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col bg-[#050505] group cursor-pointer h-[500px]">
            {/* Top */}
            <div className="h-1/2 bg-[#D96B27] relative overflow-hidden p-8">
              <h3 className="text-6xl lg:text-[80px] font-bold text-black/10 leading-none tracking-tighter">LINKED</h3>
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <pattern id="diagonal" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="black" strokeWidth="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#diagonal)" />
                <circle cx="30" cy="40" r="1" fill="black" />
                <circle cx="60" cy="70" r="1" fill="black" />
                <circle cx="80" cy="30" r="1" fill="black" />
              </svg>
            </div>
            {/* Bottom */}
            <div className="h-1/2 relative flex flex-col items-center pt-12 overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center pt-12 transition-opacity duration-500 group-hover:opacity-0">
                <span className="text-[#D96B27] text-xs font-mono mb-8">02</span>
                <span className="text-neutral-400 tracking-[0.3em] text-sm uppercase" style={{ writingMode: 'vertical-rl' }}>Identity Linkage</span>
              </div>
              <div className="absolute inset-0 p-8 flex flex-col justify-center opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[#0a0a0a]">
                <span className="text-[#D96B27] text-xs font-mono mb-4">02 // IDENTITY LINKAGE</span>
                <p className="text-neutral-400 text-sm leading-relaxed">Wallet addresses tied to payroll create a permanent, public connection between employer and employee. Financial activity, token holdings, DeFi interactions — all traceable back to a salary payment.</p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col bg-[#050505] group cursor-pointer h-[500px]">
            {/* Top */}
            <div className="h-1/2 bg-[#D96B27] relative overflow-hidden p-8">
              <h3 className="text-6xl lg:text-[80px] font-bold text-black/10 leading-none tracking-tighter">MANUAL</h3>
              <svg className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[120%] opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill="none" stroke="black" strokeWidth="0.5" />
                <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="black" strokeWidth="0.5" />
              </svg>
            </div>
            {/* Bottom */}
            <div className="h-1/2 relative flex flex-col items-center pt-12 overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center pt-12 transition-opacity duration-500 group-hover:opacity-0">
                <span className="text-[#D96B27] text-xs font-mono mb-8">03</span>
                <span className="text-neutral-400 tracking-[0.3em] text-sm uppercase" style={{ writingMode: 'vertical-rl' }}>Operational Friction</span>
              </div>
              <div className="absolute inset-0 p-8 flex flex-col justify-center opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[#0a0a0a]">
                <span className="text-[#D96B27] text-xs font-mono mb-4">03 // OPERATIONAL FRICTION</span>
                <p className="text-neutral-400 text-sm leading-relaxed">Paying 50+ employees means 50+ individual transactions. Each one needs gas, wallet confirmation, and manual tracking. One missed payment breaks the whole batch.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
