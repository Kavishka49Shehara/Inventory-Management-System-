import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Boxes, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  FolderOpen,
  ArrowLeftRight,
  Zap,
  Wrench,
  Package,
  Layers,
  Clock,
  Cpu
} from 'lucide-react';
import { PartRequest, Transaction, ActiveOperation } from '../types.js';

interface DefectSortingViewProps {
  requests: PartRequest[];
  transactions: Transaction[];
}

export default function DefectSortingView({ requests, transactions }: DefectSortingViewProps) {
  const [liveOperation, setLiveOperation] = useState<ActiveOperation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const fetchLiveOperation = async () => {
    try {
      const res = await fetch('/api/operations/active');
      if (res.ok) {
        const data = await res.json();
        setLiveOperation(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchLiveOperation();
    const interval = setInterval(fetchLiveOperation, 800);
    return () => clearInterval(interval);
  }, []);

  // Compute counts for each bin from completed transactions
  const getBinStats = (bin: 'Bin 1' | 'Bin 2' | 'Bin 3') => {
    const sortedItems = transactions.filter(t => t.sorting_bin === bin && t.status === 'Completed');
    return {
      count: sortedItems.length,
      items: sortedItems.map(s => s.defective_product)
    };
  };

  const bin1 = getBinStats('Bin 1');
  const bin2 = getBinStats('Bin 2');
  const bin3 = getBinStats('Bin 3');

  // Trigger test operations
  const triggerMechanicDefect = async (code: 'SP001' | 'SP002') => {
    setIsProcessing(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/operations/mechanic-scan-defect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusNotice(`✅ Step 01-04 Triggered: Defective ${data.product.product_name} (${code}) scanned. Conveyor running FORWARD (10s). JGB Gate 0${data.gate} opening 60° (1.5s forward -> 1.5s reverse). Storekeeper alerted!`);
        await fetchLiveOperation();
      } else {
        setStatusNotice(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusNotice(`❌ Network Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerStorekeeperIssue = async (code: 'SP001' | 'SP002') => {
    setIsProcessing(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/operations/storekeeper-scan-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusNotice(`✅ Step 05-06 Triggered: Replacement ${data.product.product_name} (${code}) issued. Stock reduced (-1). Conveyor running REVERSE (10s) to Mechanic (All gates closed)!`);
        await fetchLiveOperation();
      } else {
        setStatusNotice(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusNotice(`❌ Network Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isForwardRunning = liveOperation?.type === 'MECHANIC_DEFECT_INTAKE' && liveOperation?.conveyor_running;
  const isReverseRunning = liveOperation?.type === 'STOREKEEPER_DISPENSE' && liveOperation?.conveyor_running;
  const activeGate = liveOperation?.gate || 0;
  const gateAngle = liveOperation?.gate_angle || 0;
  const gateStatusText = liveOperation?.gate_status || 'CLOSED (0°)';

  return (
    <div className="space-y-6" id="defect-sorting-root">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Defect Return & Sorting Sinks</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            ESP32 DEV KIT • JGB GEARED DC MOTOR SORTING GATES (1.5s FORWARD ~60° / 1.5s REVERSE)
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">System Mode:</span>
          <span className={`px-2.5 py-1 rounded font-bold border ${
            isForwardRunning
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
              : isReverseRunning
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 animate-pulse'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}>
            {isForwardRunning ? 'FORWARD RUN (10s) - DEFECT SORTING' : isReverseRunning ? 'REVERSE RUN (10s) - REPLACEMENT DELIVERY' : 'STANDBY IDLE'}
          </span>
        </div>
      </div>

      {/* 6-Step Operational Specification Flow Legend */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Automated 6-Step Warehouse Conveyor Protocol</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">JGB DC Motor Timing: 1.5s Open ➔ 1.5s Return</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
          
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div>
              <span className="text-amber-400 font-bold block text-[11px]">01. SCAN DEFECT</span>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">Mechanic scans SP001 (Bearing) or SP002 (DC Motor)</p>
            </div>
            <span className="text-[9px] text-slate-500 uppercase mt-2">QR Trigger</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div>
              <span className="text-cyan-400 font-bold block text-[11px]">02. IDENTIFY</span>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">System maps part, rack location & assigned sorting bin</p>
            </div>
            <span className="text-[9px] text-slate-500 uppercase mt-2">Server DB</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div>
              <span className="text-indigo-400 font-bold block text-[11px]">03. RUN & ACTUATE</span>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Conveyor runs <strong>FORWARD</strong>. JGB Motor runs 1.5s forward to ~60°, then 1.5s reverse to 0°
              </p>
            </div>
            <span className="text-[9px] text-indigo-400 font-bold uppercase mt-2">JGB Gate 01 or 02</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div>
              <span className="text-purple-400 font-bold block text-[11px]">04. STOP AFTER 10s</span>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Conveyor & gates stop automatically after 10s run. Defect resting in target bin.
              </p>
            </div>
            <span className="text-[9px] text-slate-500 uppercase mt-2">Auto-Halt</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div>
              <span className="text-emerald-400 font-bold block text-[11px]">05. ISSUE REPLACEMENT</span>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Storekeeper scans new product. Inventory updates (Stock -1).
              </p>
            </div>
            <span className="text-[9px] text-emerald-400 font-bold uppercase mt-2">Inventory Sync</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div>
              <span className="text-teal-400 font-bold block text-[11px]">06. REVERSE 10s</span>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Conveyor runs in <strong>REVERSE</strong> (Storekeeper → Mechanic). All gates closed. Stops after 10s.
              </p>
            </div>
            <span className="text-[9px] text-teal-400 font-bold uppercase mt-2">Reverse Belt</span>
          </div>

        </div>
      </div>

      {/* Quick Interactive Testing Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-slate-300">Quick Simulation Triggers:</span>
          <span className="text-slate-500">Test JGB Gate Timing & Bidirectional Conveyor</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
          
          <button
            onClick={() => triggerMechanicDefect('SP001')}
            disabled={isProcessing}
            className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl transition-all text-left flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Wrench className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              <span>1. Mechanic: Defect SP001</span>
            </div>
            <span className="text-[10px] text-amber-400/80 mt-1">
              Bearing → Gate 01 (Bin 1) | 60° (1.5s/1.5s) | Fwd 10s
            </span>
          </button>

          <button
            onClick={() => triggerMechanicDefect('SP002')}
            disabled={isProcessing}
            className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl transition-all text-left flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Wrench className="w-4 h-4 text-indigo-400 group-hover:rotate-45 transition-transform" />
              <span>1. Mechanic: Defect SP002</span>
            </div>
            <span className="text-[10px] text-indigo-400/80 mt-1">
              DC Motor → Gate 02 (Bin 2) | 60° (1.5s/1.5s) | Fwd 10s
            </span>
          </button>

          <button
            onClick={() => triggerStorekeeperIssue('SP001')}
            disabled={isProcessing}
            className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl transition-all text-left flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Package className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>2. Storekeeper: Issue SP001</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-1">
              Bearing → -1 Stock | Rev 10s to Mechanic (Gates Closed)
            </span>
          </button>

          <button
            onClick={() => triggerStorekeeperIssue('SP002')}
            disabled={isProcessing}
            className="p-3 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl transition-all text-left flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Package className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
              <span>2. Storekeeper: Issue SP002</span>
            </div>
            <span className="text-[10px] text-teal-400/80 mt-1">
              DC Motor → -1 Stock | Rev 10s to Mechanic (Gates Closed)
            </span>
          </button>

        </div>

        {statusNotice && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 animate-in fade-in">
            {statusNotice}
          </div>
        )}
      </div>

      {/* Live Sorter Diagram/Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-500" /> 
            <span>Physical Sorter & Conveyor Telemetry</span>
          </h3>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Conveyor Status: </span>
            <span className={`px-2 py-0.5 rounded font-bold uppercase ${
              isForwardRunning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              isReverseRunning ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              'bg-slate-950 text-slate-500 border border-slate-800'
            }`}>
              {isForwardRunning ? `FORWARD (${liveOperation?.conveyor_remaining_sec}s)` :
               isReverseRunning ? `REVERSE (${liveOperation?.conveyor_remaining_sec}s)` :
               'STOPPED / STANDBY'}
            </span>
          </div>
        </div>

        {/* Mock Physical Conveyor Belt */}
        <div className="bg-slate-950 rounded-xl p-6 border border-slate-850 relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-2.5 h-4 bg-slate-900/60 border-t border-slate-800/80 flex justify-between px-4 font-mono text-[9px] text-slate-500">
            <span>MECHANIC INTAKE STATION</span>
            <span>JGB GATE 01 (BEARING)</span>
            <span>JGB GATE 02 (DC MOTOR)</span>
            <span>STOREKEEPER DISPENSE PORT</span>
          </div>

          <div className="h-32 flex items-center justify-between relative px-6 sm:px-12">
            {/* Belt lines */}
            <div className="absolute left-8 right-8 top-1/2 h-3 bg-slate-850 border border-slate-750 -translate-y-1/2 rounded-full overflow-hidden">
              {isForwardRunning && (
                <div className="h-full w-full bg-[linear-gradient(90deg,transparent_50%,#f59e0b_50%)] bg-[length:24px_100%] animate-[flowForward_0.8s_linear_infinite]" />
              )}
              {isReverseRunning && (
                <div className="h-full w-full bg-[linear-gradient(90deg,transparent_50%,#10b981_50%)] bg-[length:24px_100%] animate-[flowReverse_0.8s_linear_infinite]" />
              )}
              {!isForwardRunning && !isReverseRunning && (
                <div className="h-full w-full bg-[linear-gradient(90deg,transparent_50%,#202c3c_50%)] bg-[length:20px_100%]" />
              )}
            </div>

            {/* Mechanic Station Node */}
            <div className={`z-10 bg-slate-900 border p-2.5 rounded-xl text-center shadow-lg w-28 transition-all ${
              isForwardRunning ? 'border-amber-500/60 shadow-amber-500/10' : 'border-slate-800'
            }`}>
              <span className="text-[8px] font-mono text-slate-500 block uppercase">STATION 1</span>
              <span className="text-xs font-bold text-white uppercase mt-0.5 block flex items-center justify-center gap-1">
                <Wrench className="w-3 h-3 text-amber-400" />
                <span>Mechanic</span>
              </span>
            </div>

            {/* JGB Gate 01 Diverter (Bearing - Bin 1) */}
            <div className="z-10 flex flex-col items-center gap-1.5">
              <span className="text-[8px] font-mono text-slate-400 font-bold uppercase">Gate 01 (Bin 1)</span>
              <div 
                className={`w-2 h-14 rounded-full transition-transform duration-300 origin-bottom border shadow-lg ${
                  activeGate === 1 && isForwardRunning
                    ? 'bg-amber-400 border-white shadow-amber-500/50'
                    : 'bg-indigo-600 border-indigo-400/40'
                }`}
                style={{
                  transform: `rotate(${activeGate === 1 && isForwardRunning ? -gateAngle : 0}deg)`
                }}
              />
              <span className="text-[9px] font-mono text-white bg-slate-900 border border-slate-700 px-2 py-0.5 rounded shadow">
                {activeGate === 1 && isForwardRunning ? `${gateAngle}°` : '0° (Closed)'}
              </span>
              <span className="text-[8px] font-mono text-cyan-400">SP001 Bearing</span>
            </div>

            {/* JGB Gate 02 Diverter (DC Motor - Bin 2) */}
            <div className="z-10 flex flex-col items-center gap-1.5">
              <span className="text-[8px] font-mono text-slate-400 font-bold uppercase">Gate 02 (Bin 2)</span>
              <div 
                className={`w-2 h-14 rounded-full transition-transform duration-300 origin-bottom border shadow-lg ${
                  activeGate === 2 && isForwardRunning
                    ? 'bg-amber-400 border-white shadow-amber-500/50'
                    : 'bg-indigo-600 border-indigo-400/40'
                }`}
                style={{
                  transform: `rotate(${activeGate === 2 && isForwardRunning ? gateAngle : 0}deg)`
                }}
              />
              <span className="text-[9px] font-mono text-white bg-slate-900 border border-slate-700 px-2 py-0.5 rounded shadow">
                {activeGate === 2 && isForwardRunning ? `${gateAngle}°` : '0° (Closed)'}
              </span>
              <span className="text-[8px] font-mono text-indigo-400">SP002 DC Motor</span>
            </div>

            {/* Storekeeper Station Node */}
            <div className={`z-10 bg-slate-900 border p-2.5 rounded-xl text-center shadow-lg w-28 transition-all ${
              isReverseRunning ? 'border-emerald-500/60 shadow-emerald-500/10' : 'border-slate-800'
            }`}>
              <span className="text-[8px] font-mono text-slate-500 block uppercase">STATION 2</span>
              <span className="text-xs font-bold text-white uppercase mt-0.5 block flex items-center justify-center gap-1">
                <Package className="w-3 h-3 text-emerald-400" />
                <span>Storekeeper</span>
              </span>
            </div>

          </div>
        </div>

        {/* Live Gate Actuation Telemetry Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Active Gate Actuator:</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {activeGate > 0 && isForwardRunning ? `Gate 0${activeGate} (JGB Geared DC)` : 'All Gates Closed (0°)'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {activeGate === 1 ? 'Diverting SP001 to Bin 01' : activeGate === 2 ? 'Diverting SP002 to Bin 02' : 'No gates opened'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase block">JGB Motor Angle & Direction:</span>
            <span className="text-sm font-bold text-amber-400 mt-0.5 block">
              {isForwardRunning && activeGate > 0 ? gateStatusText : '0° Initial Standby Position'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              1.5s forward (~60°) ➔ 1.5s reverse (return)
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Conveyor 10s Timer:</span>
            <span className={`text-sm font-bold mt-0.5 block ${
              isForwardRunning ? 'text-amber-400' : isReverseRunning ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {liveOperation?.conveyor_running ? `${liveOperation.conveyor_remaining_sec}s remaining (10s total)` : 'Stopped (Standby)'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {isForwardRunning ? 'Forward (Mechanic → Bins)' : isReverseRunning ? 'Reverse (Storekeeper → Mechanic)' : 'Awaiting trigger'}
            </span>
          </div>
        </div>

        {/* Physical Storage Bins Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* BIN 1 */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3.5">
                <div>
                  <h4 className="font-bold text-white text-sm">BIN 1: Mechanical Sinks</h4>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase mt-0.5">SP001 Bearing, Valves, Couplers</p>
                </div>
                <span className="w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center border border-cyan-500/20">
                  {bin1.count}
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                {bin1.count === 0 ? (
                  <p className="text-[10px] font-mono text-slate-500 italic py-2">Bin is empty</p>
                ) : (
                  bin1.items.map((item, i) => (
                    <div key={i} className="bg-slate-900 p-2 rounded text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="text-white font-medium">{item}</span>
                      <span className="text-[8px] uppercase text-emerald-500">Recycled</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-slate-900 pt-3 mt-4 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>JGB Gate: <strong>Gate 01 (~60°)</strong></span>
              <span>Chute: Active</span>
            </div>
          </div>

          {/* BIN 2 */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3.5">
                <div>
                  <h4 className="font-bold text-white text-sm">BIN 2: Electrical Sinks</h4>
                  <p className="text-[10px] font-mono text-indigo-400 uppercase mt-0.5">SP002 DC Motor, Drivers, Sensors</p>
                </div>
                <span className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center border border-indigo-500/20">
                  {bin2.count}
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                {bin2.count === 0 ? (
                  <p className="text-[10px] font-mono text-slate-500 italic py-2">Bin is empty</p>
                ) : (
                  bin2.items.map((item, i) => (
                    <div key={i} className="bg-slate-900 p-2 rounded text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="text-white font-medium">{item}</span>
                      <span className="text-[8px] uppercase text-emerald-500">Recycled</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-slate-900 pt-3 mt-4 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>JGB Gate: <strong>Gate 02 (~60°)</strong></span>
              <span>Chute: Active</span>
            </div>
          </div>

          {/* BIN 3 */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3.5">
                <div>
                  <h4 className="font-bold text-white text-sm">BIN 3: General / Other</h4>
                  <p className="text-[10px] font-mono text-purple-400 uppercase mt-0.5">Belts, Pulleys, Fasteners</p>
                </div>
                <span className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-400 font-mono font-bold text-xs flex items-center justify-center border border-purple-500/20">
                  {bin3.count}
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                {bin3.count === 0 ? (
                  <p className="text-[10px] font-mono text-slate-500 italic py-2">Bin is empty</p>
                ) : (
                  bin3.items.map((item, i) => (
                    <div key={i} className="bg-slate-900 p-2 rounded text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="text-white font-medium">{item}</span>
                      <span className="text-[8px] uppercase text-emerald-500">Recycled</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-slate-900 pt-3 mt-4 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>JGB Gate: Standby</span>
              <span>Chute: Ready</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
