import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  Download, 
  QrCode, 
  Tag, 
  Check, 
  MapPin, 
  Layers, 
  Wrench, 
  Package, 
  UserCheck, 
  Copy,
  ExternalLink
} from 'lucide-react';
import { Product, Employee } from '../types.js';

interface ComponentQRSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  employees?: Employee[];
  onOpenScanner?: () => void;
}

interface QRCardData {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  qrPayload: string;
  rack: string;
  bin: string;
  gate: string;
  category: 'primary' | 'inventory' | 'employee';
  tagColor: string;
}

export default function ComponentQRSheetModal({
  isOpen,
  onClose,
  products,
  employees = [],
  onOpenScanner
}: ComponentQRSheetModalProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'primary' | 'inventory' | 'employee'>('primary');
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  // Generate cards
  const cards: QRCardData[] = [
    // Primary System Components
    {
      id: 'qr-sp001',
      title: 'Deep Groove Bearings',
      subtitle: 'SP001 • Primary Mechanical Defect',
      code: 'SP001',
      qrPayload: JSON.stringify({ product_id: 'SP001', barcode: '890123456789', name: 'Bearings', rack: 'B1' }),
      rack: 'Rack B1',
      bin: 'Bin 1 (Mechanical)',
      gate: 'JGB Gate 01 (~60°)',
      category: 'primary',
      tagColor: 'amber'
    },
    {
      id: 'qr-sp002',
      title: '24V DC Drive Motor',
      subtitle: 'SP002 • Primary Electrical Defect',
      code: 'SP002',
      qrPayload: JSON.stringify({ product_id: 'SP002', barcode: '890123456791', name: 'Motors', rack: 'E1' }),
      rack: 'Rack E1',
      bin: 'Bin 2 (Electrical)',
      gate: 'JGB Gate 02 (~60°)',
      category: 'primary',
      tagColor: 'indigo'
    },

    // All Inventory Products from DB
    ...products.map(p => ({
      id: `qr-prod-${p.id}`,
      title: p.product_name,
      subtitle: `${p.product_id} • Barcode: ${p.barcode}`,
      code: p.product_id,
      qrPayload: JSON.stringify({ product_id: p.product_id, barcode: p.barcode, name: p.product_name, rack: p.rack_location }),
      rack: `Rack ${p.rack_location}`,
      bin: p.sorting_bin,
      gate: p.sorting_bin === 'Bin 1' ? 'Gate 01' : p.sorting_bin === 'Bin 2' ? 'Gate 02' : 'Gate 03 / General',
      category: 'inventory' as const,
      tagColor: p.category === 'Mechanical' ? 'cyan' : p.category === 'Electrical' ? 'indigo' : 'purple'
    })),

    // Employee Badges
    {
      id: 'qr-emp-002',
      title: 'Thisraka (Mechanic)',
      subtitle: 'EMP002 • Workshop Maintenance',
      code: 'EMP002',
      qrPayload: JSON.stringify({ employee_id: 'EMP002', name: 'Thisraka', role: 'EMPLOYEE' }),
      rack: 'Station 1',
      bin: 'Mechanic Gate',
      gate: 'Intake Port',
      category: 'employee',
      tagColor: 'amber'
    },
    {
      id: 'qr-stk-001',
      title: 'Inshaf (Storekeeper)',
      subtitle: 'STK001 • Head Storekeeper',
      code: 'STK001',
      qrPayload: JSON.stringify({ employee_id: 'STK001', name: 'Inshaf', role: 'STOREKEEPER' }),
      rack: 'Station 2',
      bin: 'Dispense Bay',
      gate: 'Reverse Belt Port',
      category: 'employee',
      tagColor: 'emerald'
    },
    {
      id: 'qr-adm-001',
      title: 'Kavishka (Admin)',
      subtitle: 'ADM001 • System Administrator',
      code: 'ADM001',
      qrPayload: JSON.stringify({ employee_id: 'ADM001', name: 'Kavishka', role: 'ADMINISTRATOR' }),
      rack: 'Control Room',
      bin: 'Full Access',
      gate: 'Root Override',
      category: 'employee',
      tagColor: 'purple'
    }
  ];

  // Generate QR images on mount/open
  useEffect(() => {
    if (!isOpen) return;

    cards.forEach(card => {
      QRCode.toDataURL(card.qrPayload, {
        width: 260,
        margin: 1.5,
        color: {
          dark: '#020617',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then(url => {
          setQrImages(prev => ({ ...prev, [card.id]: url }));
        })
        .catch(err => console.error('Failed to generate QR for card', card.id, err));
    });
  }, [isOpen, products.length]);

  if (!isOpen) return null;

  const filteredCards = cards.filter(c => {
    if (activeFilter === 'all') return true;
    return c.category === activeFilter;
  });

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow popups to print QR sheets.');
      return;
    }

    const cardsHtml = filteredCards.map(c => `
      <div class="label-card">
        <img class="qr-img" src="${qrImages[c.id] || ''}" alt="${c.title}" />
        <div class="info">
          <div class="tag">${c.bin} • ${c.gate}</div>
          <div class="title">${c.title}</div>
          <div class="code">CODE: <strong>${c.code}</strong></div>
          <div class="rack">LOC: <strong>${c.rack}</strong></div>
          <div class="footnote">Warehouse Automated Sorter System</div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scannable Component QR Labels Sheet</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 10px;
              color: #000;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0 0 5px 0;
              font-size: 18px;
              text-transform: uppercase;
            }
            .header p {
              margin: 0;
              font-size: 11px;
              color: #555;
              font-family: monospace;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .label-card {
              border: 1.5px solid #000;
              border-radius: 6px;
              padding: 12px;
              display: flex;
              gap: 12px;
              align-items: center;
              page-break-inside: avoid;
            }
            .qr-img {
              width: 100px;
              height: 100px;
              display: block;
              border: 1px solid #ccc;
            }
            .info {
              flex: 1;
              font-size: 12px;
              line-height: 1.4;
            }
            .tag {
              font-size: 9px;
              font-family: monospace;
              font-weight: bold;
              text-transform: uppercase;
              background: #f1f5f9;
              padding: 2px 6px;
              border-radius: 3px;
              display: inline-block;
              margin-bottom: 4px;
            }
            .title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .code {
              font-family: monospace;
              font-size: 12px;
              color: #111;
            }
            .rack {
              font-family: monospace;
              font-size: 11px;
              color: #333;
            }
            .footnote {
              font-size: 8px;
              color: #888;
              font-family: monospace;
              margin-top: 6px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Automated Conveyor Warehouse OS • Scannable QR Labels</h1>
            <p>ESP32 DEV KIT • JGB MOTOR GATES • SCAN VIA IN-APP CAMERA OR BARCODE GUN</p>
          </div>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Scannable Component QR Codes</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Scan with your phone/webcam camera or 1D/2D USB Barcode Scanner Gun
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAll}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All Labels</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
            <button
              onClick={() => setActiveFilter('primary')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeFilter === 'primary'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Primary SP001 & SP002 (System Focus)</span>
            </button>
            <button
              onClick={() => setActiveFilter('inventory')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeFilter === 'inventory'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>All Products ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveFilter('employee')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeFilter === 'employee'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Employee Badges</span>
            </button>
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeFilter === 'all'
                  ? 'bg-purple-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>View All</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Scan ready:</span>
            <span className="text-emerald-400 font-bold">100% Compatible with App Camera</span>
          </div>
        </div>

        {/* QR Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCards.map((card) => {
              const imgUrl = qrImages[card.id];
              const isCopied = copiedId === card.id;

              return (
                <div
                  key={card.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4.5 flex gap-4 items-center shadow-lg transition-all group"
                >
                  {/* QR Image Box */}
                  <div className="shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-md relative group/qr">
                    {imgUrl ? (
                      <img 
                        src={imgUrl} 
                        alt={card.title} 
                        className="w-28 h-28 object-contain rounded"
                      />
                    ) : (
                      <div className="w-28 h-28 flex items-center justify-center text-slate-400 text-xs font-mono">
                        Generating...
                      </div>
                    )}
                    <a
                      href={imgUrl}
                      download={`${card.code}-qr-label.png`}
                      title="Download QR Image"
                      className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-mono font-bold gap-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save</span>
                    </a>
                  </div>

                  {/* Card Metadata */}
                  <div className="flex-1 min-w-0 font-mono space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        card.tagColor === 'amber' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                        card.tagColor === 'indigo' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' :
                        card.tagColor === 'cyan' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' :
                        card.tagColor === 'emerald' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                        'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      }`}>
                        {card.bin}
                      </span>
                      <span className="text-[10px] text-slate-500">{card.gate}</span>
                    </div>

                    <h4 className="text-white font-bold text-sm truncate">{card.title}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{card.subtitle}</p>

                    <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>Code: <strong className="text-emerald-400">{card.code}</strong></span>
                      <span className="text-slate-400">{card.rack}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <button
                        onClick={() => handleCopyCode(card.id, card.code)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-800 transition-colors flex items-center gap-1"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Copied' : 'Copy Code'}</span>
                      </button>

                      {onOpenScanner && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenScanner();
                          }}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>Test Camera</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>You can scan these QR codes directly off your screen using the in-app camera or mobile camera</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-bold"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
