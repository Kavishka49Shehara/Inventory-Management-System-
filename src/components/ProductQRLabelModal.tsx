import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Printer, Download, QrCode, Tag, Check, MapPin, Layers } from 'lucide-react';
import { Product } from '../types.js';

interface ProductQRLabelModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export default function ProductQRLabelModal({
  product,
  isOpen,
  onClose,
  onOpenScanner
}: ProductQRLabelModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product || !isOpen) return;

    // Encode JSON with both product_id and barcode for rich scanner compatibility
    const qrPayload = JSON.stringify({
      product_id: product.product_id,
      barcode: product.barcode,
      name: product.product_name,
      rack: product.rack_location
    });

    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#020617', // slate-950
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate QR code', err));
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow popups to print label.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${product.product_id} - ${product.product_name}</title>
          <style>
            @page {
              size: 80mm 50mm;
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 10px;
              box-sizing: border-box;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              color: #000;
            }
            .label-card {
              border: 2px solid #000;
              border-radius: 6px;
              padding: 10px;
              width: 100%;
              max-width: 300px;
              display: flex;
              gap: 12px;
              align-items: center;
            }
            .qr-img {
              width: 100px;
              height: 100px;
              display: block;
            }
            .info {
              flex: 1;
              font-size: 11px;
              line-height: 1.3;
            }
            .id-badge {
              font-size: 14px;
              font-weight: 800;
              font-family: monospace;
              background: #000;
              color: #fff;
              display: inline-block;
              padding: 2px 6px;
              border-radius: 3px;
              margin-bottom: 4px;
            }
            .title {
              font-size: 13px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .field {
              margin: 2px 0;
              font-size: 10px;
              color: #333;
            }
            .field strong {
              color: #000;
            }
            .barcode-num {
              font-family: monospace;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <img src="${qrDataUrl}" class="qr-img" />
            <div class="info">
              <div class="id-badge">${product.product_id}</div>
              <div class="title">${product.product_name}</div>
              <div class="field"><strong>Rack:</strong> ${product.rack_location} | <strong>Bin:</strong> ${product.sorting_bin}</div>
              <div class="field"><strong>Cat:</strong> ${product.category} ${product.subcategory ? `(${product.subcategory})` : ''}</div>
              <div class="field barcode-num"><strong>Code:</strong> ${product.barcode}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-LABEL-${product.product_id}-${product.barcode}.png`;
    a.click();
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(product.barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Component QR Code Label</h3>
              <p className="text-[11px] text-slate-400 font-mono">Scan or print physical asset sticker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Label Card Preview */}
          <div
            ref={printRef}
            className="bg-white text-slate-950 p-4 rounded-xl shadow-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-4 transition-all"
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Product QR"
                className="w-36 h-36 rounded-lg border border-slate-200 shrink-0 bg-white"
              />
            ) : (
              <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400 font-mono">
                Generating QR...
              </div>
            )}

            <div className="flex-1 space-y-1 text-center sm:text-left">
              <div className="inline-block bg-slate-950 text-emerald-400 font-mono text-xs font-bold px-2 py-0.5 rounded tracking-wider">
                {product.product_id}
              </div>
              <h4 className="font-bold text-slate-900 text-base leading-tight mt-1">
                {product.product_name}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-1">{product.description || 'Industrial component'}</p>

              <div className="pt-2 text-[11px] font-mono space-y-0.5 text-slate-700">
                <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>Rack: <strong>{product.rack_location}</strong></span>
                  <span className="text-slate-300">|</span>
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>{product.sorting_bin}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                  <Tag className="w-3 h-3 text-slate-500" />
                  <span>{product.category} {product.subcategory ? `• ${product.subcategory}` : ''}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono pt-1">
                  BARCODE: <span className="font-bold text-slate-900">{product.barcode}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Details Chips */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg">
              <div className="text-[10px] text-slate-400 uppercase">Current Stock</div>
              <div className="text-sm font-bold text-emerald-400">{product.quantity} Units</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg">
              <div className="text-[10px] text-slate-400 uppercase">Min Safety</div>
              <div className="text-sm font-bold text-slate-200">{product.minimum_stock} Units</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-2 rounded-lg">
              <div className="text-[10px] text-slate-400 uppercase">Status</div>
              <div className={`text-xs font-bold mt-0.5 ${
                product.quantity <= 0 ? 'text-rose-400' : product.quantity <= product.minimum_stock ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {product.status}
              </div>
            </div>
          </div>

          {/* Barcode Quick Copy */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-2.5 px-3">
            <div className="font-mono text-xs text-slate-400">
              Raw Barcode / QR String: <span className="text-slate-200 font-bold">{product.barcode}</span>
            </div>
            <button
              onClick={handleCopyBarcode}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : null}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          {onOpenScanner ? (
            <button
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Test with Scanner</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
