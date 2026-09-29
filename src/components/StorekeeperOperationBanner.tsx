import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ArrowLeftRight, 
  Package, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sliders, 
  RotateCcw, 
  ArrowRight,
  ExternalLink,
  Volume2
} from 'lucide-react';
import { ActiveOperation, Product } from '../types.js';

interface StorekeeperOperationBannerProps {
  onOpenScanner: (mode: 'MECHANIC_DEFECT' | 'STOREKEEPER_ISSUE' | 'INVENTORY_MANAGE') => void;
  onRefreshData: () => Promise<void>;
  products: Product[];
}

export default function StorekeeperOperationBanner({
  onOpenScanner,
  onRefreshData,
  products
}: StorekeeperOperationBannerProps) {
  const [operation, setOperation] = useState<ActiveOperation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchOperation = async () => {
    try {
      const res = await fetch('/api/operations/active');
      if (res.ok) {
        const data = await res.json();
        setOperation(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchOperation();
    const interval = setInterval(fetchOperation, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickIssue = async (productId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/operations/storekeeper-scan-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: productId })
      });
      if (res.ok) {
        await fetchOperation();
        await onRefreshData();
      }
    } catch (_) {
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetOperation = async () => {
    try {
      await fetch('/api/operations/reset-active', { method: 'POST' });
      await fetchOperation();
      await onRefreshData();
    } catch (_) {}
  };

  if (!operation || operation.type === 'STANDBY') {
    return null;
  }

  const isMechanicIntake = operation.type === 'MECHANIC_DEFECT_INTAKE';
  const isStorekeeperDispense = operation.type === 'STOREKEEPER_DISPENSE';
  const matchingProduct = products.find(p => p.product_id === operation.product_id);
  const remainingSec = operation.conveyor_remaining_sec ?? Math.ceil(operation.conveyor_remaining_ms / 1000);

  return (
    <div className="mb-6 rounded-2xl border overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-3">
      {/* Top Banner Bar */}
      {isMechanicIntake && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-950 border-2 border-amber-500/80 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            {/* Left: Status Icon and Details */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10 animate-pulse">
                <Wrench className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-mono font-bold uppercase tracking-wider">
                    OPERATIONS STEP 01 - 04 ACTIVE
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-semibold">
                    Conveyor: {operation.conveyor_running ? 'FORWARD RUNNING' : 'STOPPED (10s Complete)'}
                  </span>
                  {operation.conveyor_running && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                      ⏳ {remainingSec}s left
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Defective Item Intake:</span>
                  <span className="text-amber-400 underline">{operation.product_name} ({operation.product_id})</span>
                </h3>

                {/* Conveyor & Gate Diagnostics */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>Conveyor: <strong>FORWARD (10s)</strong> → Mechanic to Storage</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>JGB Gate 0{operation.gate}: <strong>60° (1.5s open ➔ 1.5s return to 0°)</strong></span>
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    Target: <strong>{operation.sorting_bin}</strong>
                  </span>
                  <span className="text-cyan-400 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Pick from Rack: <strong>{operation.rack_location}</strong>
                  </span>
                </div>

                {operation.storekeeper_alert && (
                  <p className="text-xs text-amber-200/90 font-mono bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg mt-2 inline-block">
                    🔔 <strong>Storekeeper Notice:</strong> {operation.storekeeper_alert.message}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => onOpenScanner('STOREKEEPER_ISSUE')}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 uppercase"
              >
                <Package className="w-4 h-4" />
                <span>Scan Replacement (Storekeeper)</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => handleQuickIssue(operation.product_id)}
                className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                title="Directly confirm replacement issue without opening camera"
              >
                <span>Quick Issue from Rack {operation.rack_location}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              <button
                onClick={handleResetOperation}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-200 text-center py-1"
              >
                Cancel / Reset Belt
              </button>
            </div>

          </div>

          {/* Progress bar */}
          {operation.conveyor_running && (
            <div className="mt-3 w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div 
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, (operation.conveyor_remaining_ms / operation.duration_ms) * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Storekeeper Dispense Reverse Conveyor Banner */}
      {isStorekeeperDispense && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 border-2 border-emerald-500/80 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10 animate-pulse">
                <Package className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-mono font-bold uppercase tracking-wider">
                    OPERATIONS STEP 05 - 06 ACTIVE
                  </span>
                  <span className="text-xs font-mono text-emerald-300 font-semibold">
                    Conveyor: {operation.conveyor_running ? 'REVERSE RUNNING' : 'DELIVERY COMPLETED (10s)'}
                  </span>
                  {operation.conveyor_running && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                      ⏳ {remainingSec}s remaining
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Replacement Issued:</span>
                  <span className="text-emerald-400 underline">{operation.product_name} ({operation.product_id})</span>
                  <span className="text-xs font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">
                    Stock reduced by 1
                  </span>
                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>Conveyor: <strong>REVERSE (10s)</strong> → Storekeeper to Mechanic</span>
                  </span>
                  <span className="text-slate-400">
                    Sorting Gates: <strong>ALL CLOSED (0°)</strong> (Direct Delivery)
                  </span>
                  {matchingProduct && (
                    <span className="text-emerald-300">
                      Remaining Inventory: <strong>{matchingProduct.quantity} units</strong> in Rack {matchingProduct.rack_location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleResetOperation}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl border border-slate-700 transition-colors"
              >
                Reset / Standby
              </button>
            </div>

          </div>

          {operation.conveyor_running && (
            <div className="mt-3 w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div 
                className="bg-emerald-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, (operation.conveyor_remaining_ms / operation.duration_ms) * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
