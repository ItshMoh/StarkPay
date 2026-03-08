import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Plus, Trash2, CheckCircle, AlertCircle, ChevronLeft, Download } from 'lucide-react';

export default function Send() {
  const [recipients] = useState([
    { id: 1, address: '0x049d...3e2f', amount: '0.10', name: 'Esther Howard', status: 'valid' },
    { id: 2, address: '0x028a...9b1c', amount: '0.05', name: 'James Johnson', status: 'valid' },
    { id: 3, address: 'invalid_address', amount: '0.01', name: 'Wade Warren', status: 'invalid' },
  ]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative">
      <div className="px-8 lg:px-16 xl:px-24 py-12 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-12">
          <Link to="/dashboard" className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-500 rounded-full">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-4xl font-medium tracking-tight">Send Payroll</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-1 space-y-8">
            {/* CSV Upload */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-6 bg-neutral-50/50 dark:bg-[#111111]/50">
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-4">Batch Upload</h3>
              <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md p-8 flex flex-col items-center justify-center text-center hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer mb-4">
                <Upload size={24} className="text-neutral-400 mb-3" />
                <p className="text-sm font-medium mb-1">Click to upload CSV</p>
                <p className="text-xs text-neutral-500">or drag and drop</p>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[10px] uppercase">
                  Validate CSV
                </button>
                <button className="flex-1 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-semibold transition-colors tracking-[0.15em] text-[10px] uppercase text-neutral-500 flex justify-center items-center gap-2" title="Download Error Rows">
                  <Download size={14} /> Errors
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1"></div>
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase">OR</span>
              <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1"></div>
            </div>

            {/* Manual Entry */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-6">
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-4">Manual Entry</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Recipient Address *</label>
                  <input type="text" placeholder="0x..." className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Amount (BTC) *</label>
                  <input type="number" placeholder="0.00" className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Employee Name (Optional)</label>
                  <input type="text" placeholder="John Doe" className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors" />
                </div>
              </div>
              
              <button className="w-full py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase flex justify-center items-center gap-2">
                <Plus size={14} /> Add Recipient
              </button>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Payroll Note (Optional)</label>
              <textarea placeholder="e.g., October 2023 Salary" className="w-full bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-sm py-2 px-3 text-sm outline-none focus:border-[#F28C38] transition-colors resize-none h-20"></textarea>
            </div>
          </div>

          {/* Right Column: Preview & Submit */}
          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium">Payroll Preview</h2>
              <button className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                Clear All
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase mb-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 px-4">
              <div className="col-span-4">Wallet Address</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-3">Employee</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-1"></div>
            </div>
            
            {/* Table Body */}
            <div className="flex-1 overflow-y-auto min-h-[300px] mb-8">
              {recipients.map((r) => (
                <div key={r.id} className={`grid grid-cols-12 gap-4 text-sm items-center py-4 border-b border-neutral-100 dark:border-neutral-800/50 px-4 -mx-4 ${r.status === 'invalid' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <div className="col-span-4 font-mono text-neutral-600 dark:text-neutral-300 text-xs truncate pr-2" title={r.address}>{r.address}</div>
                  <div className="col-span-2 font-medium">{r.amount}</div>
                  <div className="col-span-3 text-neutral-500 truncate pr-2">{r.name}</div>
                  <div className="col-span-2 flex justify-center">
                    {r.status === 'valid' ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <span title="Invalid address format">
                        <AlertCircle size={16} className="text-red-500" />
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button className="text-neutral-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary & Submit */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6 mt-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <div className="text-sm text-neutral-500 mb-1">Recipients: <span className="font-medium text-neutral-900 dark:text-white">3</span></div>
                  <div className="text-sm text-neutral-500">Est. Gas: <span className="font-medium text-neutral-900 dark:text-white">~0.0001 BTC</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500 mb-1 uppercase tracking-widest font-bold">Total Amount</div>
                  <div className="text-3xl font-medium tracking-tight">0.16 BTC</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 py-4 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase">
                  Preview Transfer
                </button>
                <button className="flex-1 py-4 bg-[#F28C38] hover:bg-[#e07b27] text-white font-semibold transition-colors tracking-[0.15em] text-[11px] uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                  Send Payroll
                </button>
              </div>
              
              {/* Status Message Example */}
              <div className="mt-4 p-3 bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                Ready to submit. 1 invalid row needs correction.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
