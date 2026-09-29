import React, { useState } from 'react';
import { 
  X, 
  PackagePlus, 
  CheckCircle2, 
  ArrowRight, 
  Boxes, 
  MapPin, 
  Layers, 
  Tag, 
  RefreshCw,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Product } from '../types.js';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialSelectedProductId?: string | null;
  onRefreshData?: () => Promise<void>;
  currentUser?: { name: string; username?: string; role: string } | null;
}

export default function RestockModal({
  isOpen,
  onClose,
  products,
  initialSelectedProductId,
  onRefreshData,
  currentUser
}: RestockModalProps) {
  // Mode: Single part restock vs multi-part batch intake
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Single mode state
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialSelectedProductId || (products[0]?.id || '')
  );
  const [quantityToAdd, setQuantityToAdd] = useState<number>(10);
  const [deliveryRef, setDeliveryRef] = useState<string>('');

  // Batch mode state: map of productId -> quantity to add
  const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync selected product when modal opens with initialSelectedProductId
  React.useEffect(() => {
    if (initialSelectedProductId) {
      setSelectedProductId(initialSelectedProductId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
    setFeedback(null);
  }, [initialSelectedProductId, isOpen, products]);

  if (!isOpen) return null;

  const currentProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Handle single stock update
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || quantityToAdd <= 0) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/inventory/scan-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentProduct.barcode,
          action: 'ADD_STOCK',
          quantity: quantityToAdd,
          notes: deliveryRef || 'Stock Restock / Delivery Intake',
          performed_by: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Storekeeper Intake'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update stock');
      }

      setFeedback({
        type: 'success',
        message: `Successfully added ${quantityToAdd} units to ${currentProduct.product_name}. New Stock: ${data.new_quantity} units.`
      });

      if (onRefreshData) {
        await onRefreshData();
      }

      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error occurred while updating stock'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle batch stock update
  const handleBatchSubmit = async () => {
    const itemsToUpdate = Object.entries(batchQuantities).filter(([_, qty]) => (Number(qty) || 0) > 0);
    if (itemsToUpdate.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please enter a quantity greater than 0 for at least one component.'
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      let updatedCount = 0;
      for (const [prodId, qty] of itemsToUpdate) {
        const prod = products.find(p => p.id === prodId);
        if (!prod) continue;

        await fetch('/api/inventory/scan-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: prod.barcode,
            action: 'ADD_STOCK',
            quantity: qty,
            notes: deliveryRef || 'Batch Stock Intake',
            performed_by: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Storekeeper Intake'
          })
        });
        updatedCount++;
      }

      setFeedback({
        type: 'success',
        message: `Successfully restocked ${updatedCount} spare parts catalog items!`
      });

      setBatchQuantities({});

      if (onRefreshData) {
        await onRefreshData();
      }

      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error updating batch inventory'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Receive / Restock Inventory</h3>
              <p className="text-[11px] text-slate-400 font-mono">Add counts of newly received stock into warehouse racks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'single'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single Part Restock
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'batch'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Multi-Item Batch Intake
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Catalog: <strong className="text-white">{products.length} Items</strong>
          </span>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
          {mode === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-5">
              
              {/* Select Component Dropdown */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Select Component to Restock:
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.product_id}] {p.product_name} • Current: {p.quantity} Units (Rack {p.rack_location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Product Info Snapshot */}
              {currentProduct && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                          {currentProduct.product_id}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {currentProduct.product_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Barcode: {currentProduct.barcode}
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-[10px] text-slate-500 uppercase">Current Stock</div>
                      <div className="text-base font-bold text-emerald-400">
                        {currentProduct.quantity} Units
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>Rack: <strong className="text-white">{currentProduct.rack_location}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded">
                      <Layers className="w-3 h-3 text-purple-400" />
                      <span>{currentProduct.sorting_bin}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded">
                      <Tag className="w-3 h-3 text-amber-400" />
                      <span>{currentProduct.category}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity to Add Controls */}
              <div className="space-y-2">
                <label className="block text-xs font-mono text-slate-400">
                  New Incoming Quantity to Add:
                </label>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 5))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-sm transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantityToAdd}
                      onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 text-center bg-transparent py-1 font-mono text-base font-bold text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantityToAdd(quantityToAdd + 5)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-sm transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex gap-1.5 font-mono">
                    {[5, 10, 25, 50, 100].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQuantityToAdd(amt)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          quantityToAdd === amt
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculation Preview */}
              {currentProduct && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between">
                  <span className="text-slate-400">Total Stock After Restocking:</span>
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="text-slate-400">{currentProduct.quantity} Units</span>
                    <span className="text-emerald-400 font-bold">+{quantityToAdd}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-base text-emerald-400">
                      {currentProduct.quantity + quantityToAdd} Units
                    </span>
                  </span>
                </div>
              )}

              {/* Notes / Delivery Reference */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Delivery Reference / PO Notes (Optional):
                </label>
                <input
                  type="text"
                  value={deliveryRef}
                  onChange={(e) => setDeliveryRef(e.target.value)}
                  placeholder="e.g. Supplier PO#4829, Monthly Bearing Batch Intake, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || quantityToAdd <= 0}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>
                  Confirm Restock (+{quantityToAdd} Units to {currentProduct?.product_name})
                </span>
              </button>
            </form>
          ) : (
            /* Multi-Item Batch Restock Table */
            <div className="space-y-4">
              <p className="text-xs font-mono text-slate-400">
                Enter incoming quantities for multiple items in your shipment delivery:
              </p>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                      <th className="p-3">SKU</th>
                      <th className="p-3">Component Name</th>
                      <th className="p-3 text-right">Current Stock</th>
                      <th className="p-3 text-center">Add Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                    {products.map(p => {
                      const qty = batchQuantities[p.id] || 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40">
                          <td className="p-3 text-emerald-400 font-bold">{p.product_id}</td>
                          <td className="p-3">
                            <div className="font-bold text-white">{p.product_name}</div>
                            <div className="text-[10px] text-slate-500">Rack {p.rack_location} • {p.category}</div>
                          </td>
                          <td className="p-3 text-right text-slate-300 font-bold">{p.quantity}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={qty === 0 ? '' : qty}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  setBatchQuantities(prev => ({ ...prev, [p.id]: val }));
                                }}
                                className="w-16 text-center bg-slate-950 border border-slate-700 rounded-lg py-1 font-bold text-white text-xs focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <input
                  type="text"
                  value={deliveryRef}
                  onChange={(e) => setDeliveryRef(e.target.value)}
                  placeholder="Optional Batch Delivery Note (e.g. PO#7741 Supplier Shipment)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Commit Batch Stock Intake</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Updates immediately sync to Warehouse DB and Firestore</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
