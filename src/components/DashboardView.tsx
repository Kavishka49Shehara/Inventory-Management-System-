import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Clock, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  MapPin, 
  Trash2, 
  ArrowRight, 
  Play,
  Activity,
  Cpu,
  ClipboardList
} from 'lucide-react';
import { PartRequest, Product, Employee } from '../types.js';

interface DashboardViewProps {
  stats: {
    totalItems: number;
    totalQuantity: number;
    pendingRequests: number;
    defectiveReturned: number;
    completedTransactions: number;
  };
  requests: PartRequest[];
  products: Product[];
  employees: Employee[];
  onConfirmIssue: (id: string) => Promise<void>;
  onRejectRequest: (id: string) => Promise<void>;
  onSimulateScan: (empBarcode: string, prodBarcode: string) => Promise<void>;
  onTriggerStatusUpdate: (id: string, status: PartRequest['status']) => Promise<void>;
}

export default function DashboardView({
  stats,
  requests,
  products,
  employees,
  onConfirmIssue,
  onRejectRequest,
  onSimulateScan,
  onTriggerStatusUpdate
}: DashboardViewProps) {
  const [selectedSimEmp, setSelectedSimEmp] = useState('');
  const [selectedSimProd, setSelectedSimProd] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeNotification, setActiveNotification] = useState<PartRequest | null>(null);

  // Auto-detect a newly added Pending request to show the real-time Storekeeper notification popup
  useEffect(() => {
    const latestPending = requests.find(r => r.status === 'Pending');
    if (latestPending) {
      // Check if we haven't shown a notification for this request ID in this session yet
      const shownKey = `shown_notif_${latestPending.id}`;
      if (!sessionStorage.getItem(shownKey)) {
        setActiveNotification(latestPending);
        sessionStorage.setItem(shownKey, 'true');
        // Auto play an alert sound or show a beep indicator
      }
    }
  }, [requests]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimEmp || !selectedSimProd) return;
    setIsSimulating(true);
    setSimMessage(null);
    try {
      await onSimulateScan(selectedSimEmp, selectedSimProd);
      setSimMessage({ type: 'success', text: 'Barcode Scan Registered! Request Sent to ESP32-C3 Gate.' });
      setTimeout(() => setSimMessage(null), 4000);
    } catch (err: any) {
      setSimMessage({ type: 'error', text: err.message || 'Scan failed.' });
    } finally {
      setIsSimulating(false);
    }
  };

  const getStatusBadgeClass = (status: PartRequest['status']) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse';
      case 'Defective Item Received':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Sorting':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'Awaiting Storekeeper':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'Approved':
        return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
      case 'Delivering':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="space-y-6" id="dashboard-view-root">
      
      {/* Real-time Storekeeper Alert Pop-up */}
      {activeNotification && (
        <div 
          id="realtime-notification-popup"
          className="bg-slate-900 border-2 border-amber-500 rounded-xl p-5 shadow-2xl shadow-amber-500/10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between animate-bounce"
        >
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/30 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">
                  NEW SPARE PART REQUEST
                </span>
                <span className="text-xs text-slate-400 font-mono">#{activeNotification.request_id}</span>
              </div>
              <h4 className="font-bold text-white mt-1">
                Employee: {activeNotification.employee_name} ({activeNotification.department})
              </h4>
              <p className="text-sm text-slate-300 mt-0.5">
                Defective: <span className="font-semibold text-amber-400">{activeNotification.defective_product_name}</span> 
                {' '}→ Replacement: <span className="font-semibold text-emerald-400">{activeNotification.replacement_product_name}</span>
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1">
                📍 Rack Location: <span className="text-white font-semibold underline">{activeNotification.rack_location}</span> | 📦 Sorter Sinks: <span className="text-white font-semibold">{activeNotification.sorting_bin}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                onConfirmIssue(activeNotification.id);
                setActiveNotification(null);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
            >
              APPROVE & DELIVER
            </button>
            <button
              onClick={() => setActiveNotification(null)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase">Industrial Overview</h2>
          <p className="text-sm text-slate-400 font-mono mt-0.5">RESTRICTED WAREHOUSE INTEGRATED AUTOMATION STATS</p>
        </div>
        <div className="flex items-center gap-2 font-mono bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-lg text-xs text-slate-400">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>ESP32 CONNECTIONS: </span>
          <span className="font-bold text-white">2 ONLINE</span>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Inventory Items */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Items</span>
            <span className="text-2xl font-bold text-white tracking-tight mt-1 block">{stats.totalItems}</span>
            <span className="text-[10px] font-mono text-emerald-500 mt-1 block">✔ In Catalog</span>
          </div>
          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 border border-slate-700">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Available Quantity */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Available</span>
            <span className="text-2xl font-bold text-white tracking-tight mt-1 block">{stats.totalQuantity}</span>
            <span className="text-[10px] font-mono text-emerald-500 mt-1 block">✔ Active Stock</span>
          </div>
          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 border border-slate-700">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        {/* Card 3: Pending Requests */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Pending Requests</span>
            <span className={`text-2xl font-bold tracking-tight mt-1 block ${stats.pendingRequests > 0 ? 'text-amber-500' : 'text-white'}`}>{stats.pendingRequests}</span>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">⏱ Queue Length</span>
          </div>
          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 border border-slate-700">
            <Clock className={`w-5 h-5 ${stats.pendingRequests > 0 ? 'text-amber-500 animate-spin' : ''}`} />
          </div>
        </div>

        {/* Card 4: Defective Items Returned */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Defect Returns</span>
            <span className="text-2xl font-bold text-white tracking-tight mt-1 block">{stats.defectiveReturned}</span>
            <span className="text-[10px] font-mono text-indigo-400 mt-1 block">♻ Sorted to Bins</span>
          </div>
          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 border border-slate-700">
            <RotateCcw className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        {/* Card 5: Completed Transactions */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Completed Deliveries</span>
            <span className="text-2xl font-bold text-white tracking-tight mt-1 block">{stats.completedTransactions}</span>
            <span className="text-[10px] font-mono text-teal-400 mt-1 block">🤝 Issued Successfully</span>
          </div>
          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 border border-slate-700">
            <CheckCircle className="w-5 h-5 text-teal-400" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Request Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Live Request Panel</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              REAL-TIME UPDATES
            </span>
          </div>

          <div className="p-5 flex-1 space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin">
            {requests.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <ClipboardList className="w-12 h-12 mx-auto stroke-1 mb-2 opacity-40" />
                <p className="text-sm font-medium">No requests generated yet</p>
                <p className="text-xs font-mono mt-1">Use the right hardware simulator to scan barcodes</p>
              </div>
            ) : (
              requests.slice(0, 5).map((req) => {
                const product = products.find(p => p.product_id === req.replacement_product_id);
                const stockQty = product ? product.quantity : 0;
                
                return (
                  <div 
                    key={req.id} 
                    className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-lg p-4 transition-all relative overflow-hidden"
                  >
                    {/* Top status header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{req.request_id}</span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(req.request_time).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${getStatusBadgeClass(req.status)}`}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Request Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Employee Column */}
                      <div className="flex gap-2.5 items-start">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-slate-500 uppercase leading-none">Requesting Employee</p>
                          <h5 className="text-xs font-bold text-white mt-1">{req.employee_name}</h5>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{req.department} Technician</p>
                        </div>
                      </div>

                      {/* Spare Part Column */}
                      <div className="flex gap-2.5 items-start">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-slate-500 uppercase leading-none">Replacement & Rack</p>
                          <h5 className="text-xs font-bold text-emerald-400 mt-1">{req.replacement_product_name}</h5>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Rack <span className="text-white font-semibold underline">{req.rack_location}</span> | Sorter <span className="text-white font-semibold">{req.sorting_bin}</span>
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Bottom control row */}
                    <div className="mt-4 pt-3.5 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                        <span>Current Rack Stock: </span>
                        <span className={`font-bold ${stockQty === 0 ? 'text-rose-500' : stockQty <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {stockQty} units
                        </span>
                      </div>

                      {/* Storekeeper operational buttons */}
                      <div className="flex items-center gap-2">
                        {req.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => onTriggerStatusUpdate(req.id, 'Defective Item Received')}
                              className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded font-mono text-[10px] font-semibold transition-colors uppercase"
                              title="Advance Conveyor to Sorter"
                            >
                              1. Receive Defective
                            </button>
                            <button
                              onClick={() => onRejectRequest(req.id)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded transition-colors"
                              title="Reject Request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {req.status === 'Defective Item Received' && (
                          <button
                            onClick={() => onTriggerStatusUpdate(req.id, 'Sorting')}
                            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded font-mono text-[10px] font-semibold transition-colors uppercase"
                          >
                            2. Sort to {req.sorting_bin}
                          </button>
                        )}

                        {req.status === 'Sorting' && (
                          <button
                            onClick={() => onTriggerStatusUpdate(req.id, 'Awaiting Storekeeper')}
                            className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded font-mono text-[10px] font-semibold transition-colors uppercase animate-pulse"
                          >
                            3. Signal Rack {req.rack_location} LED
                          </button>
                        )}

                        {req.status === 'Awaiting Storekeeper' && (
                          <div className="flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="text-[10px] font-mono text-amber-500 font-semibold uppercase mr-2">LED Indication Active</span>
                            <button
                              onClick={() => onConfirmIssue(req.id)}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded font-mono text-[10px] font-bold transition-all uppercase shadow-md"
                            >
                              Confirm Issue & Reverse Conveyor
                            </button>
                          </div>
                        )}

                        {req.status === 'Completed' && (
                          <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            <span>TRANSACTION COMPLETED</span>
                          </div>
                        )}

                        {req.status === 'Rejected' && (
                          <div className="flex items-center gap-1 text-[10px] font-mono text-rose-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>REQUEST REJECTED</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Barcode Simulator Panel (Right Column) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Cpu className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">ESP32-C3 Gateway</h3>
                <p className="text-[10px] text-slate-400 font-mono">RFID & BARCODE SCANNER SIMULATOR</p>
              </div>
            </div>

            {/* Dedicated Quick 6-Step Operations Triggers */}
            <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                ⚡ 1-Click Operations Triggers (SP001 / SP002)
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/operations/mechanic-scan-defect', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: 'SP001' })
                    });
                    setSimMessage({ type: 'success', text: 'Step 01-04: Defect SP001 (Bearing) scanned! Fwd 10s + JGB Gate 01 60°' });
                  }}
                  className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-left"
                >
                  <span className="font-bold block">1. Defect SP001</span>
                  <span className="text-[9px] text-amber-400/80">Bearing ➔ Gate 01</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/operations/mechanic-scan-defect', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: 'SP002' })
                    });
                    setSimMessage({ type: 'success', text: 'Step 01-04: Defect SP002 (DC Motor) scanned! Fwd 10s + JGB Gate 02 60°' });
                  }}
                  className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-left"
                >
                  <span className="font-bold block">1. Defect SP002</span>
                  <span className="text-[9px] text-indigo-400/80">DC Motor ➔ Gate 02</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/operations/storekeeper-scan-issue', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: 'SP001' })
                    });
                    setSimMessage({ type: 'success', text: 'Step 05-06: Replacement SP001 issued! Stock -1, Rev 10s' });
                  }}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-left"
                >
                  <span className="font-bold block">2. Issue SP001</span>
                  <span className="text-[9px] text-emerald-400/80">Bearing ➔ Rev 10s</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/operations/storekeeper-scan-issue', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: 'SP002' })
                    });
                    setSimMessage({ type: 'success', text: 'Step 05-06: Replacement SP002 issued! Stock -1, Rev 10s' });
                  }}
                  className="p-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg text-left"
                >
                  <span className="font-bold block">2. Issue SP002</span>
                  <span className="text-[9px] text-teal-400/80">DC Motor ➔ Rev 10s</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4 font-mono leading-relaxed">
              Or manually select employee card and defective barcode below:
            </p>

            <form onSubmit={handleSimulate} className="space-y-4">
              
              {/* Employee ID dropdown */}
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                  1. Scan Employee ID (Barcode / RFID)
                </label>
                <select
                  value={selectedSimEmp}
                  onChange={(e) => setSelectedSimEmp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                >
                  <option value="">-- SELECT EMPLOYEE CARD --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.barcode_id}>
                      {e.name} ({e.employee_id}) - {e.authorization_status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Barcode dropdown */}
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                  2. Scan Defective Product Barcode
                </label>
                <select
                  value={selectedSimProd}
                  onChange={(e) => setSelectedSimProd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                >
                  <option value="">-- SELECT DEFECTIVE BARCODE --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.barcode}>
                      {p.product_name} (Barcode: {p.barcode}) - Stock: {p.quantity}
                    </option>
                  ))}
                </select>
              </div>

              {simMessage && (
                <div className={`p-2.5 rounded text-xs font-mono border ${
                  simMessage.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {simMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSimulating || !selectedSimEmp || !selectedSimProd}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-lg text-xs transition-colors uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Trigger Barcode Scan Command
              </button>
            </form>
          </div>

          <div className="border-t border-slate-800 pt-4 mt-5">
            <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-widest">ESP32-C3 Output format:</span>
            <pre className="bg-slate-950 text-[10px] text-slate-400 p-2.5 rounded mt-1.5 font-mono overflow-x-auto border border-slate-900">
{`{
  "device": "ESP32-C3",
  "employee_barcode": "${selectedSimEmp || 'EMP001'}",
  "product_barcode": "${selectedSimProd || '890123456789'}",
  "event": "NEW_REQUEST"
}`}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}
