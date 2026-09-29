import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertOctagon, 
  Activity, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Folder 
} from 'lucide-react';
import { Product, Transaction } from '../types.js';

interface ReportsViewProps {
  products: Product[];
  transactions: Transaction[];
}

export default function ReportsView({ products, transactions }: ReportsViewProps) {
  // 1. Compute low & out of stock products
  const outOfStock = products.filter(p => p.quantity === 0);
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minimum_stock);

  // 2. Frequency of requested products (from completed transactions)
  const partRequestFreq: Record<string, number> = {};
  const defectReturnFreq: Record<string, number> = {};

  transactions.forEach(t => {
    if (t.status === 'Completed') {
      partRequestFreq[t.replacement_product] = (partRequestFreq[t.replacement_product] || 0) + 1;
      defectReturnFreq[t.defective_product] = (defectReturnFreq[t.defective_product] || 0) + 1;
    }
  });

  const topRequested = Object.entries(partRequestFreq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topReturned = Object.entries(defectReturnFreq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 3. Bin Distribution Percentages
  const totalCompleted = transactions.filter(t => t.status === 'Completed').length;
  const bin1Count = transactions.filter(t => t.sorting_bin === 'Bin 1' && t.status === 'Completed').length;
  const bin2Count = transactions.filter(t => t.sorting_bin === 'Bin 2' && t.status === 'Completed').length;
  const bin3Count = transactions.filter(t => t.sorting_bin === 'Bin 3' && t.status === 'Completed').length;

  const bin1Pct = totalCompleted > 0 ? Math.round((bin1Count / totalCompleted) * 100) : 0;
  const bin2Pct = totalCompleted > 0 ? Math.round((bin2Count / totalCompleted) * 100) : 0;
  const bin3Pct = totalCompleted > 0 ? Math.round((bin3Count / totalCompleted) * 100) : 0;

  // 4. Daily transaction flow mock timeline (representing 5 days back)
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Today'];
  const mockFlow = [12, 18, 15, 24, 30, 8, totalCompleted];

  const maxFlowVal = Math.max(...mockFlow, 10);

  return (
    <div className="space-y-6" id="reports-view-root">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Analytics & Stock Reports</h2>
        <p className="text-xs text-slate-400 font-mono mt-0.5">WAREHOUSE TRANSACTION RATIOS AND DEFECT SORTING PERFORMANCE METRICS</p>
      </div>

      {/* Grid: Stock Alerts and Bin distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Low and Out-of-Stock alert summary panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <AlertOctagon className="text-rose-500 w-4.5 h-4.5 animate-pulse" /> Safety Margin Warnings
          </h3>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
            {outOfStock.length === 0 && lowStock.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                All spare-parts are healthy & above minimum stock.
              </div>
            ) : (
              <>
                {outOfStock.map(p => (
                  <div key={p.id} className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold bg-rose-500 text-slate-950 px-1.5 py-0.5 rounded uppercase">
                        OUT OF STOCK
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1.5">{p.product_name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Rack {p.rack_location} | SKU: {p.product_id}</p>
                    </div>
                    <span className="text-lg font-bold text-rose-500 font-mono">0</span>
                  </div>
                ))}
                
                {lowStock.map(p => (
                  <div key={p.id} className="bg-amber-950/10 border border-amber-900/20 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded uppercase">
                        CRITICAL LOW ({p.quantity})
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1.5">{p.product_name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Rack {p.rack_location} | Min threshold: {p.minimum_stock}</p>
                    </div>
                    <span className="text-lg font-bold text-amber-500 font-mono">{p.quantity}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Sorting Category Distributions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <RotateCcw className="text-indigo-400 w-4.5 h-4.5" /> Sorter Bin Load-Balance
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-5 leading-relaxed">
              Distribution of defective items routed and deposited inside physical bins based on categories.
            </p>

            <div className="space-y-4">
              {/* Bin 1 */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                  <span>Bin 1 (Mechanical: {bin1Count} items)</span>
                  <span className="text-cyan-400 font-bold">{bin1Pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${bin1Pct}%` }} />
                </div>
              </div>

              {/* Bin 2 */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                  <span>Bin 2 (Electrical: {bin2Count} items)</span>
                  <span className="text-indigo-400 font-bold">{bin2Pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${bin2Pct}%` }} />
                </div>
              </div>

              {/* Bin 3 */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                  <span>Bin 3 (Other: {bin3Count} items)</span>
                  <span className="text-slate-400 font-bold">{bin3Pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-slate-400 rounded-full transition-all" style={{ width: `${bin3Pct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-850 mt-5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Total Logged Defects:</span>
            <span className="text-white font-bold">{totalCompleted} items</span>
          </div>
        </div>

        {/* Daily flow bar chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="text-emerald-500 w-4.5 h-4.5" /> Daily Transaction Volumes
            </h3>
            
            {/* SVG mini chart */}
            <div className="h-44 flex items-end justify-between gap-1 pb-3 pt-5 border-b border-slate-800 px-2">
              {mockFlow.map((v, i) => {
                const heightPct = Math.round((v / maxFlowVal) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <span className="text-[10px] text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                      {v}
                    </span>
                    <div 
                      className="w-full bg-slate-800 group-hover:bg-emerald-500 rounded-t-sm transition-all duration-500 border border-slate-700 group-hover:border-emerald-300" 
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[8px] font-mono text-slate-500 rotate-45 origin-left mt-1 block">
                      {days[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 text-[9px] font-mono text-slate-500 uppercase text-center mt-6">
            Rollover Audit: 7-Day Running window
          </div>
        </div>

      </div>

      {/* Lists row: Top requested vs top returned defective */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top requested replacements */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="text-emerald-400 w-4.5 h-4.5" /> High-Demand Replacement Parts
          </h3>
          
          <div className="space-y-3">
            {topRequested.length === 0 ? (
              <div className="text-slate-500 text-xs font-mono py-6 text-center">No transactional requests logged yet</div>
            ) : (
              topRequested.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-900">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-500 font-bold">#0{idx+1}</span>
                    <span className="text-xs text-white font-semibold">{item.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">{item.count} Issued</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top returned defective */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <RotateCcw className="text-indigo-400 w-4.5 h-4.5" /> Frequently Defective Returns
          </h3>

          <div className="space-y-3">
            {topReturned.length === 0 ? (
              <div className="text-slate-500 text-xs font-mono py-6 text-center">No returns completed yet</div>
            ) : (
              topReturned.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-900">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-500 font-bold">#0{idx+1}</span>
                    <span className="text-xs text-white font-semibold">{item.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-indigo-400">{item.count} Returns</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
