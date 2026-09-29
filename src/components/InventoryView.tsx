import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Filter,
  MapPin,
  RefreshCw,
  QrCode,
  PackagePlus,
  Camera
} from 'lucide-react';
import { Product } from '../types.js';
import QRScannerModal from './QRScannerModal.js';
import ProductQRLabelModal from './ProductQRLabelModal.js';
import RestockModal from './RestockModal.js';

interface InventoryViewProps {
  products: Product[];
  onSaveProduct: (product: any) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
  currentUser?: any;
  onOpenScanner?: () => void;
  onOpenQRSheet?: () => void;
}

export default function InventoryView({ 
  products, 
  onSaveProduct, 
  onDeleteProduct,
  onRefreshData,
  currentUser,
  onOpenScanner,
  onOpenQRSheet
}: InventoryViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  
  // Restock modal state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);

  // QR Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form states
  const [productId, setProductId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<'Mechanical' | 'Electrical' | 'Other'>('Electrical');
  const [subcategory, setSubcategory] = useState('Drivers and Sensors');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [minStock, setMinStock] = useState(3);
  const [rack, setRack] = useState('A1');

  const openAddModal = () => {
    setEditingProduct(null);
    setProductId('');
    setBarcode('');
    setProductName('');
    setCategory('Electrical');
    setSubcategory('Drivers and Sensors');
    setDescription('');
    setQuantity(10);
    setMinStock(3);
    setRack('A1');
    setIsOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setProductId(p.product_id);
    setBarcode(p.barcode);
    setProductName(p.product_name);
    setCategory(p.category);
    setSubcategory(p.subcategory || (p.category === 'Electrical' ? 'Drivers and Sensors' : 'General'));
    setDescription(p.description);
    setQuantity(p.quantity);
    setMinStock(p.minimum_stock);
    setRack(p.rack_location);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productId || !barcode) {
      alert('Please fill out all required fields');
      return;
    }

    const payload: any = {
      product_id: productId,
      barcode,
      product_name: productName,
      category,
      subcategory,
      description,
      quantity,
      minimum_stock: minStock,
      rack_location: rack,
    };

    if (editingProduct) {
      payload.id = editingProduct.id;
    }

    try {
      await onSaveProduct(payload);
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving product');
    }
  };

  const handleDelete = async (p: Product) => {
    if (confirm(`Are you sure you want to delete ${p.product_name} from inventory?`)) {
      try {
        await onDeleteProduct(p.id);
      } catch (err: any) {
        alert(err.message || 'Error deleting product');
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) || 
                          p.product_id.toLowerCase().includes(search.toLowerCase()) || 
                          (p.subcategory && p.subcategory.toLowerCase().includes(search.toLowerCase())) ||
                          p.barcode.includes(search);
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === 'OUT') matchesStock = p.quantity <= 0;
    else if (stockFilter === 'LOW') matchesStock = p.quantity > 0 && p.quantity <= p.minimum_stock;
    else if (stockFilter === 'NORMAL') matchesStock = p.quantity > p.minimum_stock;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const getStockStatusBadge = (p: Product) => {
    if (p.quantity <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
          <AlertTriangle className="w-3 h-3" /> OUT OF STOCK
        </span>
      );
    }
    if (p.quantity <= p.minimum_stock) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
          <AlertTriangle className="w-3 h-3 animate-pulse" /> LOW STOCK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
        <CheckCircle className="w-3 h-3" /> NORMAL
      </span>
    );
  };

  return (
    <div className="space-y-6" id="inventory-view-root">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Spare Parts Inventory</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">MANAGE RESTRICTED STORAGE PRODUCTS AND BIN DESIGNATION</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenQRSheet && (
            <button
              onClick={onOpenQRSheet}
              className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/35 font-bold px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 uppercase tracking-wide transition-all font-mono shadow-sm"
              title="View, Test, and Print All Scannable Component QR Codes Sheet"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>Component QR Codes Sheet</span>
            </button>
          )}
          <button
            onClick={() => onOpenScanner ? onOpenScanner() : setIsScannerOpen(true)}
            className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/35 font-bold px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 uppercase tracking-wide transition-all font-mono shadow-sm"
            title="Scan components using device camera"
          >
            <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Scan with Camera</span>
          </button>
          <button
            onClick={() => {
              setRestockProductId(null);
              setIsRestockModalOpen(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 uppercase tracking-wide shadow-lg shadow-emerald-500/20 font-mono transition-all"
            title="Add incoming stock counts to existing components"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Update / Restock Stock</span>
          </button>
          <button
            onClick={openAddModal}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 uppercase tracking-wide font-mono transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Spare Part</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search spare parts or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-mono mr-1">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none font-medium text-xs font-mono"
            >
              <option value="ALL">ALL CATEGORIES</option>
              <option value="Mechanical">MECHANICAL</option>
              <option value="Electrical">ELECTRICAL</option>
              <option value="Other">OTHER</option>
            </select>
          </div>

          {/* Stock Level Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Boxes className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-mono mr-1">Status:</span>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none font-medium text-xs font-mono"
            >
              <option value="ALL">ALL LEVELS</option>
              <option value="NORMAL">NORMAL STOCK</option>
              <option value="LOW">LOW STOCK</option>
              <option value="OUT">OUT OF STOCK</option>
            </select>
          </div>
        </div>

      </div>

      {/* Grid of Inventory list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 text-[10px] font-mono uppercase tracking-wider">
                <th className="p-4">SKU / ID</th>
                <th className="p-4">Barcode</th>
                <th className="p-4">Product Name / Description</th>
                <th className="p-4">Category</th>
                <th className="p-4">Rack Position</th>
                <th className="p-4 text-center">Sorter Bin</th>
                <th className="p-4 text-right">Available Qty</th>
                <th className="p-4 text-center">Stock Level</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500 font-mono text-xs">
                    No warehouse parts found matching filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-950/20 transition-all text-xs">
                    <td className="p-4 font-mono font-semibold text-white">{p.product_id}</td>
                    <td className="p-4 font-mono text-slate-400">{p.barcode}</td>
                    <td className="p-4">
                      <div>
                        <div className="font-bold text-white text-sm">{p.product_name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{p.description}</div>
                      </div>
                    </td>
                    <td className="p-4 font-mono">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          p.category === 'Mechanical' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                          p.category === 'Electrical' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          'bg-slate-600/10 text-slate-400'
                        }`}>
                          {p.category}
                        </span>
                        {p.subcategory && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-amber-300 border border-amber-500/30 font-semibold uppercase">
                            ↳ {p.subcategory}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        Rack {p.rack_location}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono">
                      <span className="px-2.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700 font-semibold">
                        {p.sorting_bin}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      <div className="flex items-center justify-end gap-2">
                        <span>{p.quantity} <span className="text-[10px] text-slate-500 font-normal">/ min {p.minimum_stock}</span></span>
                        <button
                          onClick={() => {
                            setRestockProductId(p.id);
                            setIsRestockModalOpen(true);
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all flex items-center gap-0.5"
                          title={`Add new stock count to ${p.product_name}`}
                        >
                          <Plus className="w-2.5 h-2.5" /> Stock
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {getStockStatusBadge(p)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setRestockProductId(p.id);
                            setIsRestockModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-emerald-500/10 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                          title={`Restock / Add count to ${p.product_name}`}
                        >
                          <PackagePlus className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button
                          onClick={() => setSelectedProductForQR(p)}
                          className="p-1.5 hover:bg-cyan-500/10 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                          title="View & Print QR Code Label"
                        >
                          <QrCode className="w-4 h-4 text-cyan-400" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                          title="Edit Part"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Part"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                {editingProduct ? '✏ Edit Spare Part' : '➕ Add Replacement Spare Part'}
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Part SKU / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. P-001"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Barcode Value *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 890123456789"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Part Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bearings"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setCategory(cat);
                      if (cat === 'Electrical') {
                        setSubcategory('Drivers and Sensors');
                      } else if (cat === 'Mechanical') {
                        setSubcategory('Bearings');
                      } else {
                        setSubcategory('General');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Subsection / Subcategory *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Drivers and Sensors, Motors, Bearings"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Rack Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B2"
                    value={rack}
                    onChange={(e) => setRack(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Initial Stock Level</label>
                  <input
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Part Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed technical specs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/20 -mx-5 -mb-5 p-5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold transition-colors uppercase flex items-center gap-1.5"
                >
                  {editingProduct ? 'Save Changes' : 'Register Spare Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Printable Label Modal */}
      <ProductQRLabelModal
        product={selectedProductForQR}
        isOpen={!!selectedProductForQR}
        onClose={() => setSelectedProductForQR(null)}
        onOpenScanner={() => {
          setSelectedProductForQR(null);
          if (onOpenScanner) onOpenScanner();
          else setIsScannerOpen(true);
        }}
      />

      {/* QR Component Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onRefreshData={onRefreshData || (async () => {})}
        currentUser={currentUser}
        onOpenLabelModal={(product) => {
          setIsScannerOpen(false);
          setSelectedProductForQR(product);
        }}
      />

      {/* Restock & Stock Intake Modal */}
      <RestockModal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        products={products}
        initialSelectedProductId={restockProductId}
        onRefreshData={onRefreshData}
        currentUser={currentUser}
      />

    </div>
  );
}
