import React, { useState } from 'react';
import { 
  ClipboardList, 
  User, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  ArrowRight,
  Filter,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { PartRequest, Product } from '../types.js';

interface RequestViewProps {
  requests: PartRequest[];
  products: Product[];
  onConfirmIssue: (id: string) => Promise<void>;
  onRejectRequest: (id: string) => Promise<void>;
  onTriggerStatusUpdate: (id: string, status: PartRequest['status']) => Promise<void>;
}

export default function RequestView({ 
  requests, 
  products, 
  onConfirmIssue, 
  onRejectRequest, 
  onTriggerStatusUpdate 
}: RequestViewProps) {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return r.status !== 'Completed' && r.status !== 'Rejected';
    if (statusFilter === 'COMPLETED') return r.status === 'Completed';
    return r.status === statusFilter;
  });

  const getStatusColor = (status: PartRequest['status']) => {
    switch (status) {
      case 'Pending':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Defective Item Received':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Sorting':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'Awaiting Storekeeper':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Approved':
        return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'Delivering':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Completed':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Rejected':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const handleActionClick = async (req: PartRequest, action: 'CONFIRM_DEFECT' | 'SORT' | 'SIGNAL_LED' | 'DELIVER' | 'REJECT') => {
    if (action === 'REJECT') {
      if (confirm(`Are you sure you want to REJECT request ${req.request_id} for ${req.employee_name}?`)) {
        await onRejectRequest(req.id);
      }
      return;
    }

    if (action === 'CONFIRM_DEFECT') {
      await onTriggerStatusUpdate(req.id, 'Defective Item Received');
      return;
    }

    if (action === 'SORT') {
      await onTriggerStatusUpdate(req.id, 'Sorting');
      return;
    }

    if (action === 'SIGNAL_LED') {
      await onTriggerStatusUpdate(req.id, 'Awaiting Storekeeper');
      return;
    }

    if (action === 'DELIVER') {
      if (confirm(`Are you sure you want to confirm delivery of replacement ${req.replacement_product_name} from Rack ${req.rack_location} to Employee ${req.employee_id}?`)) {
        await onConfirmIssue(req.id);
      }
    }
  };

  return (
    <div className="space-y-6" id="request-view-root">
      
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Spare Parts Requests</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">MANAGE CONVEYOR ROUTING, SORTING, AND DELIVERY CONFIRMATION</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400 font-mono">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-none text-white focus:outline-none font-mono uppercase"
          >
            <option value="ALL">All Requests</option>
            <option value="ACTIVE">All Active</option>
            <option value="Pending">Pending</option>
            <option value="Defective Item Received">Defective Received</option>
            <option value="Sorting">Sorting</option>
            <option value="Awaiting Storekeeper">Awaiting Storekeeper</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Request Tracking List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-12 text-center rounded-xl text-slate-500 font-mono text-sm">
            <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-1" />
            No active spare-parts requests found.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const product = products.find(p => p.product_id === req.replacement_product_id);
            const stockQty = product ? product.quantity : 0;
            
            return (
              <div 
                key={req.id} 
                className={`bg-slate-900 border rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${
                  req.status === 'Completed' ? 'border-slate-800 opacity-80' : 
                  req.status === 'Rejected' ? 'border-rose-950 opacity-60' : 'border-slate-700 ring-1 ring-slate-800'
                }`}
              >
                
                {/* Header Strip */}
                <div className="bg-slate-950/60 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 font-mono">
                    <span className="font-bold text-white text-sm">{req.request_id}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">Created: {new Date(req.request_time).toLocaleString()}</span>
                    {req.completion_time && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-emerald-400 font-semibold">Completed: {new Date(req.completion_time).toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Body Details Grid */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left: Employee Info */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Requestor Identity</span>
                    <div className="flex gap-3 items-start">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{req.employee_name}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {req.employee_id}</p>
                        <p className="text-[10px] text-emerald-400 font-mono mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 inline-block font-semibold">
                          {req.department}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Defect & Replacement Part */}
                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-4 md:pt-0">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Defect & Sorter Mapping</span>
                    <div>
                      <div className="text-xs text-slate-400">Returned Defective Item:</div>
                      <div className="font-bold text-slate-300 text-sm mt-0.5">{req.defective_product_name}</div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400 mt-2">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Assigned Conveyor Sink: </span>
                        <span className="font-bold text-white underline">{req.sorting_bin}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Replacement & Rack LED */}
                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-4 md:pt-0">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Replacement Delivery & Rack</span>
                    <div>
                      <div className="text-xs text-slate-400">Required replacement:</div>
                      <div className="font-bold text-emerald-400 text-sm mt-0.5">{req.replacement_product_name}</div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mt-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Rack Storage Bin: </span>
                        <span className="font-bold text-white underline">{req.rack_location}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-1">
                        Current rack stock: <span className={`font-bold ${stockQty === 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{stockQty} units</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Workflow Wizard Control Panel */}
                <div className="bg-slate-950/40 p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  
                  {/* Dynamic Workflow Instructions */}
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>
                      {req.status === 'Pending' && 'Step 1: Wait for defective item placement. Confirm receipt to trigger sorting servo.'}
                      {req.status === 'Defective Item Received' && 'Step 2: Defective received on conveyor. Click to sort defective to assigned bin.'}
                      {req.status === 'Sorting' && 'Step 3: Defective sorted. Click to signal storekeeper and blink Rack LED.'}
                      {req.status === 'Awaiting Storekeeper' && `Step 4: Retrieve replacement from Rack ${req.rack_location} (LED is ON). Confirm issue to reverse conveyor.`}
                      {req.status === 'Completed' && 'Workflow successfully finished. Inventory updated and logs saved.'}
                      {req.status === 'Rejected' && 'Request was cancelled/rejected by Storekeeper.'}
                    </span>
                  </div>

                  {/* Operational Controls depending on state */}
                  <div className="flex items-center gap-2">
                    {req.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleActionClick(req, 'CONFIRM_DEFECT')}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-slate-950 rounded text-xs font-mono font-bold uppercase transition-all"
                        >
                          Confirm Defect Received
                        </button>
                        <button
                          onClick={() => handleActionClick(req, 'REJECT')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 rounded text-xs font-mono text-slate-400 transition-all uppercase"
                        >
                          Reject Request
                        </button>
                      </>
                    )}

                    {req.status === 'Defective Item Received' && (
                      <button
                        onClick={() => handleActionClick(req, 'SORT')}
                        className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-mono font-bold uppercase transition-all"
                      >
                        Activate Sorter Sinks ({req.sorting_bin})
                      </button>
                    )}

                    {req.status === 'Sorting' && (
                      <button
                        onClick={() => handleActionClick(req, 'SIGNAL_LED')}
                        className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs font-mono font-bold uppercase transition-all animate-pulse"
                      >
                        Signal LED ON (Rack {req.rack_location})
                      </button>
                    )}

                    {req.status === 'Awaiting Storekeeper' && (
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-mono animate-pulse">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          Rack LED Active
                        </span>
                        <button
                          onClick={() => handleActionClick(req, 'DELIVER')}
                          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-mono font-bold uppercase transition-all shadow-md shadow-emerald-500/10"
                        >
                          Confirm Delivery & Reverse Conveyor
                        </button>
                      </div>
                    )}

                    {req.status === 'Completed' && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                        <CheckCircle className="w-4 h-4" />
                        <span>COMPLETED</span>
                      </div>
                    )}

                    {req.status === 'Rejected' && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                        <XCircle className="w-4 h-4" />
                        <span>REJECTED</span>
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
  );
}
