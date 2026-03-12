import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, Wallet, FileUp } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#050505] text-white py-24 px-8 lg:px-16 xl:px-24 border-b border-neutral-800 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-[#D96B27] text-[10px] tracking-[0.3em] font-mono uppercase">How It Works</h2>
        </div>

        {/* Steps Container */}
        <div className="relative flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-0">

          {/* Connecting Line 1 */}
          <div className="hidden lg:block absolute top-[100px] left-[12.5%] w-[25%] h-[1px] bg-neutral-800 z-0">
            <motion.div
              className="h-full bg-[#D96B27]"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 1.5 }}
            />
          </div>

          {/* Connecting Line 2 */}
          <div className="hidden lg:block absolute top-[100px] left-[37.5%] w-[25%] h-[1px] bg-neutral-800 z-0">
            <motion.div
              className="h-full bg-[#D96B27]"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 3.0 }}
            />
          </div>

          {/* Connecting Line 3 */}
          <div className="hidden lg:block absolute top-[100px] left-[62.5%] w-[25%] h-[1px] bg-neutral-800 z-0">
            <motion.div
              className="h-full bg-[#D96B27]"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 4.5 }}
            />
          </div>

          {/* Step 1: UPLOAD CSV */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0 }}
            className="flex flex-col items-center w-full lg:w-1/4 z-10"
          >
            <div className="w-full max-w-[240px] h-[200px] rounded-2xl border border-neutral-800 bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center mb-10">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Arc and Dots */}
                <div className="absolute top-[30px] w-full flex justify-center">
                  <svg width="120" height="40" viewBox="0 0 120 40" className="absolute top-4">
                    <path d="M 10 10 Q 60 40 110 10" fill="none" stroke="#D96B27" strokeWidth="1" opacity="0.3" />
                  </svg>
                  <div className="flex gap-6 absolute top-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D96B27] opacity-50"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D96B27] opacity-50 relative">
                      <motion.div
                        animate={{ height: [0, 30, 0], top: [0, 0, 30] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="absolute left-1/2 -translate-x-1/2 w-[1px] bg-[#D96B27]"
                      />
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D96B27] opacity-50"></div>
                  </div>
                </div>

                {/* CSV file dropping */}
                <motion.div
                  animate={{ y: [-30, 15], opacity: [0, 1, 0], scale: [0.9, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="absolute top-[45px] w-14 h-16 border border-neutral-700 bg-[#111] rounded-md flex flex-col gap-2 p-2.5 z-20 shadow-lg"
                >
                  <div className="w-full h-1.5 bg-neutral-600 rounded-full"></div>
                  <div className="w-3/4 h-1.5 bg-neutral-600 rounded-full"></div>
                  <div className="w-full h-1.5 bg-neutral-600 rounded-full"></div>
                </motion.div>

                {/* Glowing Box */}
                <motion.div
                  animate={{ boxShadow: ['0 0 20px rgba(217,107,39,0.1)', '0 0 40px rgba(217,107,39,0.4)', '0 0 20px rgba(217,107,39,0.1)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="w-[72px] h-[72px] rounded-xl border border-[#D96B27] bg-[#0a0a0a] flex items-center justify-center relative z-30 mt-12"
                >
                  <FileUp size={20} className="text-[#D96B27]" />
                  <motion.div
                    animate={{ opacity: [0, 0, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-[#D96B27] shadow-[0_0_10px_#D96B27]"
                  />
                </motion.div>
              </div>
            </div>

            <div className="flex flex-col items-center text-center px-4">
              <div className="w-10 h-10 rounded-full border border-[#D96B27] text-[#D96B27] flex items-center justify-center font-mono text-sm mb-6">1</div>
              <h3 className="text-[#D96B27] text-[11px] tracking-[0.2em] font-bold uppercase mb-4">Upload CSV</h3>
              <p className="text-neutral-500 text-xs leading-relaxed max-w-[220px]">Employer uploads a CSV with wallet addresses, amounts, and employee names. System validates and converts to note bundles.</p>
            </div>
          </motion.div>

          {/* Step 2: BATCH DEPOSIT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 2.3 }}
            className="flex flex-col items-center w-full lg:w-1/4 z-10"
          >
            <div className="w-full max-w-[240px] h-[200px] rounded-2xl border border-neutral-800 bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center mb-10">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

              {/* Animated Dots Merging into pool */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ x: [-80, 0], opacity: [0, 1, 0], scale: [1, 1, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                  className="absolute flex items-center justify-center"
                >
                  <div className="absolute w-6 h-6 rounded-full border border-emerald-500/30" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                </motion.div>

                <motion.div
                  animate={{ y: [-60, 0], opacity: [0, 1, 0], scale: [1, 1, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 2.7 }}
                  className="absolute flex items-center justify-center"
                >
                  <div className="absolute w-6 h-6 rounded-full border border-emerald-500/30" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                </motion.div>

                <motion.div
                  animate={{ x: [80, 0], opacity: [0, 1, 0], scale: [1, 1, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 2.9 }}
                  className="absolute flex items-center justify-center"
                >
                  <div className="absolute w-6 h-6 rounded-full border border-[#D96B27]/30" />
                  <div className="w-2 h-2 rounded-full bg-[#D96B27] shadow-[0_0_10px_#D96B27]" />
                </motion.div>
              </div>

              <motion.div
                animate={{ boxShadow: ['0 0 20px rgba(217,107,39,0.1)', '0 0 40px rgba(217,107,39,0.5)', '0 0 20px rgba(217,107,39,0.1)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                className="w-[72px] h-[72px] rounded-xl border border-[#D96B27] bg-[#0a0a0a] flex items-center justify-center relative z-10"
              >
                <span className="text-[#D96B27] font-mono text-[10px]">POOL</span>
              </motion.div>
            </div>

            <div className="flex flex-col items-center text-center px-4">
              <div className="w-10 h-10 rounded-full border border-[#D96B27] text-[#D96B27] flex items-center justify-center font-mono text-sm mb-6">2</div>
              <h3 className="text-[#D96B27] text-[11px] tracking-[0.2em] font-bold uppercase mb-4">Batch Deposit</h3>
              <p className="text-neutral-500 text-xs leading-relaxed max-w-[220px]">Tokens transfer from the employer wallet into the shielded pool. Each payment becomes a cryptographic note commitment.</p>
            </div>
          </motion.div>

          {/* Step 3: SHIELDED TRANSFER */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 3.8 }}
            className="flex flex-col items-center w-full lg:w-1/4 z-10"
          >
            <div className="w-full max-w-[240px] h-[200px] rounded-2xl border border-neutral-800 bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center mb-10">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

              <div className="flex items-center gap-0 relative z-10">
                {/* CPU Box */}
                <div className="w-12 h-12 rounded-lg border border-neutral-700 bg-[#0a0a0a] flex items-center justify-center text-neutral-500 z-20">
                  <Cpu size={18} />
                </div>

                {/* Line 1 */}
                <div className="w-10 h-[1px] bg-neutral-800 relative">
                  <motion.div
                    animate={{ width: ["0%", "100%", "100%", "0%"], left: ["0%", "0%", "0%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 4.0 }}
                    className="absolute top-0 left-0 h-full bg-emerald-500"
                  />
                </div>

                {/* Shield */}
                <motion.div
                  animate={{ color: ['#737373', '#10b981', '#737373'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1], delay: 4.0 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center z-20"
                >
                  <ShieldCheck size={14} />
                </motion.div>

                {/* Line 2 */}
                <div className="w-10 h-[1px] bg-neutral-800 relative">
                  <motion.div
                    animate={{ width: ["0%", "0%", "100%", "100%", "0%"], left: ["0%", "0%", "0%", "0%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 0.8, 1], delay: 4.0 }}
                    className="absolute top-0 left-0 h-full bg-emerald-500"
                  />
                </div>

                {/* ZK Box */}
                <motion.div
                  animate={{ boxShadow: ['0 0 10px rgba(217,107,39,0.1)', '0 0 20px rgba(217,107,39,0.4)', '0 0 10px rgba(217,107,39,0.1)'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 4.0 }}
                  className="w-12 h-12 rounded-lg border border-[#D96B27] bg-[#0a0a0a] flex items-center justify-center z-20"
                >
                  <span className="text-[#D96B27] font-mono text-[9px]">ZK</span>
                </motion.div>
              </div>
            </div>

            <div className="flex flex-col items-center text-center px-4">
              <div className="w-10 h-10 rounded-full border border-[#D96B27] text-[#D96B27] flex items-center justify-center font-mono text-sm mb-6">3</div>
              <h3 className="text-[#D96B27] text-[11px] tracking-[0.2em] font-bold uppercase mb-4">Shielded Transfer</h3>
              <p className="text-neutral-500 text-xs leading-relaxed max-w-[220px]">ZK proofs break the on-chain link between sender and recipient. No one can trace who paid whom.</p>
            </div>
          </motion.div>

          {/* Step 4: EMPLOYEE WITHDRAW */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 5.3 }}
            className="flex flex-col items-center w-full lg:w-1/4 z-10"
          >
            <div className="w-full max-w-[240px] h-[200px] rounded-2xl border border-neutral-800 bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center mb-10">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

              <div className="absolute inset-0 flex items-center justify-center">
                {/* Token exiting pool toward wallet */}
                <motion.div
                  animate={{ x: [-30, 30], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 5.5 }}
                  className="absolute w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] z-20"
                />

                {/* Pool icon (left) */}
                <div className="w-12 h-12 rounded-lg border border-neutral-700 bg-[#0a0a0a] flex items-center justify-center z-10 mr-8">
                  <ShieldCheck size={16} className="text-neutral-500" />
                </div>

                {/* Connecting line */}
                <div className="w-12 h-[1px] bg-neutral-800 absolute z-0">
                  <motion.div
                    animate={{ width: ["0%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 5.5 }}
                    className="h-full bg-emerald-500/50"
                  />
                </div>

                {/* Wallet icon (right) */}
                <motion.div
                  animate={{ boxShadow: ['0 0 10px rgba(16,185,129,0.1)', '0 0 25px rgba(16,185,129,0.4)', '0 0 10px rgba(16,185,129,0.1)'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 5.5 }}
                  className="w-12 h-12 rounded-lg border border-emerald-500/50 bg-[#0a0a0a] flex items-center justify-center z-10 ml-8"
                >
                  <Wallet size={16} className="text-emerald-500" />
                </motion.div>
              </div>
            </div>

            <div className="flex flex-col items-center text-center px-4">
              <div className="w-10 h-10 rounded-full border border-[#D96B27] text-[#D96B27] flex items-center justify-center font-mono text-sm mb-6">4</div>
              <h3 className="text-[#D96B27] text-[11px] tracking-[0.2em] font-bold uppercase mb-4">Employee Withdraw</h3>
              <p className="text-neutral-500 text-xs leading-relaxed max-w-[220px]">Employee proves note ownership with a ZK proof. The pool verifies, checks nullifiers, and releases tokens privately.</p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
