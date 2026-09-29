import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  X, 
  Camera, 
  Upload, 
  Keyboard, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Minus, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  MapPin, 
  Layers, 
  Tag, 
  ArrowRight, 
  History, 
  Zap, 
  ShieldCheck,
  Package,
  QrCode,
  Wrench,
  ArrowLeftRight,
  Clock,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { Product, ActiveOperation } from '../types.js';

interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  product_name: string;
  product_id: string;
  action: 'ADD_STOCK' | 'REMOVE_STOCK' | 'SET_STOCK' | 'RELOCATE';
  delta: number;
  new_quantity: number;
}

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRefreshData: () => Promise<void>;
  currentUser?: { name: string; username?: string; role: string; employee_id?: string } | null;
  onOpenLabelModal?: (product: Product) => void;
  initialMode?: 'MECHANIC_DEFECT' | 'STOREKEEPER_ISSUE' | 'INVENTORY_MANAGE';
}

export default function QRScannerModal({
  isOpen,
  onClose,
  products,
  onRefreshData,
  currentUser,
  onOpenLabelModal,
  initialMode = 'MECHANIC_DEFECT'
}: QRScannerModalProps) {
  // Terminal Workflow Mode
  const [terminalMode, setTerminalMode] = useState<'MECHANIC_DEFECT' | 'STOREKEEPER_ISSUE' | 'INVENTORY_MANAGE'>(initialMode);
  const [liveOperation, setLiveOperation] = useState<ActiveOperation | null>(null);

  // Modes & Camera state
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Fast Batch Mode (for general inventory manage)
  const [batchMode, setBatchMode] = useState<'INSPECT' | 'RAPID_ADD' | 'RAPID_SUB'>('INSPECT');
  const [lastScannedRaw, setLastScannedRaw] = useState<string>('');
  
  // Identified Product State
  const [identifiedProduct, setIdentifiedProduct] = useState<Product | null>(null);
  const [scannedNotFoundCode, setScannedNotFoundCode] = useState<string | null>(null);

  // Form update inputs
  const [updateAction, setUpdateAction] = useState<'ADD_STOCK' | 'REMOVE_STOCK' | 'SET_STOCK' | 'RELOCATE'>('ADD_STOCK');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [newRackInput, setNewRackInput] = useState<string>('A1');
  const [notesInput, setNotesInput] = useState<string>('');
  const [manualCodeInput, setManualCodeInput] = useState<string>('');

  // Status message
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Session history
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  // Refs for scanner
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const isStoppingRef = useRef<boolean>(false);
  const containerId = 'qr-camera-viewport';

  // Poll live operation telemetry
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
    if (isOpen) {
      setTerminalMode(initialMode);
      fetchLiveOperation();
      const interval = setInterval(fetchLiveOperation, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, initialMode]);

  // Sound Synth Generator
  const playSound = (type: 'success' | 'error' | 'click') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (_) {}
  };

  // Helper to parse scanned code
  const resolveProductFromCode = (rawCode: string): Product | null => {
    const trimmed = rawCode.trim();
    if (!trimmed) return null;

    let targetCode = trimmed;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.barcode) targetCode = parsed.barcode;
      else if (parsed.product_id) targetCode = parsed.product_id;
      else if (parsed.productId) targetCode = parsed.productId;
    } catch (_) {}

    const targetLower = targetCode.toLowerCase();
    const found = products.find(p => 
      p.barcode.toLowerCase() === targetLower ||
      p.product_id.toLowerCase() === targetLower ||
      p.id.toLowerCase() === targetLower ||
      p.product_name.toLowerCase() === targetLower
    );

    if (found) return found;

    // Specific alias checks for SP001 and SP002
    if (
      targetLower === 'sp001' || 
      targetLower === 'sp-001' || 
      targetLower === 'p-001' || 
      targetLower === '890123456789' || 
      targetLower.includes('bearing')
    ) {
      return products.find(p => 
        p.product_id === 'SP001' || 
        p.barcode === 'SP001' || 
        p.product_name.toLowerCase().includes('bearing')
      ) || null;
    }

    if (
      targetLower === 'sp002' || 
      targetLower === 'sp-002' || 
      targetLower === 'p-003' || 
      targetLower === '890123456791' || 
      targetLower.includes('motor')
    ) {
      return products.find(p => 
        p.product_id === 'SP002' || 
        p.barcode === 'SP002' || 
        p.product_name.toLowerCase().includes('motor')
      ) || null;
    }

    return null;
  };

  // Main Scan Trigger Handler
  const handleCodeDetected = async (rawCode: string) => {
    const now = Date.now();
    // Debounce duplicate scans within 1.5 seconds if identical
    if (rawCode === lastScannedRaw && now - lastScannedTimeRef.current < 1500) {
      return;
    }

    lastScannedTimeRef.current = now;
    setLastScannedRaw(rawCode);

    const product = resolveProductFromCode(rawCode);

    if (!product) {
      playSound('error');
      setIdentifiedProduct(null);
      setScannedNotFoundCode(rawCode);
      setFeedbackMessage({
        type: 'error',
        text: `Unrecognized Code: "${rawCode}". Please scan SP001 (Bearing) or SP002 (DC Motor).`
      });
      return;
    }

    setScannedNotFoundCode(null);
    setIdentifiedProduct(product);
    setNewRackInput(product.rack_location);

    if (terminalMode === 'MECHANIC_DEFECT') {
      await executeMechanicDefectIntake(product);
    } else if (terminalMode === 'STOREKEEPER_ISSUE') {
      await executeStorekeeperReplacementIssue(product);
    } else {
      // General inventory update
      playSound('success');
      if (batchMode === 'RAPID_ADD' || batchMode === 'RAPID_SUB') {
        const action = batchMode === 'RAPID_ADD' ? 'ADD_STOCK' : 'REMOVE_STOCK';
        await executeDirectUpdate(product, action, 1, undefined, undefined, 'Rapid Barcode/QR Batch Scan');
      } else {
        setFeedbackMessage({
          type: 'success',
          text: `Identified: ${product.product_name} (${product.product_id})`
        });
      }
    }
  };

  // Step 1: Execute Mechanic Defect Intake
  const executeMechanicDefectIntake = async (product: Product) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/operations/mechanic-scan-defect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: product.product_id,
          mechanic_id: currentUser?.employee_id || 'EMP002',
          mechanic_name: currentUser?.name || 'Mechanic (Workshop)'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register defective part');
      }

      playSound('success');
      setFeedbackMessage({
        type: 'success',
        text: `✅ DEFECTIVE PART RECEIVED: ${product.product_name} [${product.product_id}]. Conveyor running FORWARD (10s). JGB Gate 0${data.gate} opening 60° (1.5s open -> 1.5s return). Storekeeper notified to pick replacement from Rack ${data.rack_location}!`
      });

      const newEntry: ScanHistoryEntry = {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        product_name: product.product_name,
        product_id: product.product_id,
        action: 'REMOVE_STOCK',
        delta: 0,
        new_quantity: product.quantity
      };
      setScanHistory(prev => [newEntry, ...prev.slice(0, 19)]);

      await fetchLiveOperation();
      await onRefreshData();
    } catch (err: any) {
      playSound('error');
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error processing defect scan'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Execute Storekeeper Replacement Issue
  const executeStorekeeperReplacementIssue = async (product: Product) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/operations/storekeeper-scan-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: product.product_id,
          storekeeper_id: currentUser?.employee_id || 'STK001',
          storekeeper_name: currentUser?.name || 'Head Storekeeper'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue replacement');
      }

      playSound('success');
      setIdentifiedProduct(data.product);
      setFeedbackMessage({
        type: 'success',
        text: `✅ REPLACEMENT DISPENSED: ${product.product_name} [${product.product_id}]. Inventory updated: ${data.previous_quantity} -> ${data.new_quantity}. Conveyor running REVERSE (10s) to Mechanic (All gates closed)!`
      });

      const newEntry: ScanHistoryEntry = {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        product_name: product.product_name,
        product_id: product.product_id,
        action: 'REMOVE_STOCK',
        delta: -1,
        new_quantity: data.new_quantity
      };
      setScanHistory(prev => [newEntry, ...prev.slice(0, 19)]);

      await fetchLiveOperation();
      await onRefreshData();
    } catch (err: any) {
      playSound('error');
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error dispensing replacement'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct Inventory API Call
  const executeDirectUpdate = async (
    product: Product,
    action: 'ADD_STOCK' | 'REMOVE_STOCK' | 'SET_STOCK' | 'RELOCATE',
    qty: number,
    newQty?: number,
    rack?: string,
    notes?: string
  ) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/inventory/scan-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: product.barcode,
          action,
          quantity: qty,
          new_quantity: newQty,
          rack_location: rack,
          notes: notes || 'Updated via QR Scanner Terminal',
          performed_by: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Storekeeper Scanner'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update inventory');
      }

      // Update identified product in local state
      setIdentifiedProduct(data.product);

      // Add to session scan history
      const newEntry: ScanHistoryEntry = {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        product_name: data.product.product_name,
        product_id: data.product.product_id,
        action,
        delta: data.delta,
        new_quantity: data.new_quantity
      };
      setScanHistory(prev => [newEntry, ...prev.slice(0, 19)]);

      setFeedbackMessage({
        type: 'success',
        text: data.message
      });

      // Refresh global state
      await onRefreshData();
    } catch (err: any) {
      playSound('error');
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error updating stock'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Available camera devices
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  // Start Camera with resilient fallback (environment -> user -> deviceId)
  const startCameraScanner = async (specificCameraId?: string) => {
    setCameraError(null);
    setIsRequestingPermission(true);

    try {
      // 1. Verify Browser Support
      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser or this connection does not support the Camera MediaDevices API (getUserMedia). Ensure HTTPS is used.');
      }

      // 2. Stop any existing scanner cleanly
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (_) {}
        try {
          await scannerRef.current.clear();
        } catch (_) {}
        scannerRef.current = null;
      }

      // 3. Ensure target element exists in DOM
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('Scanner DOM container not ready yet, retrying...');
        setTimeout(() => startCameraScanner(specificCameraId), 150);
        return;
      }
      container.innerHTML = '';

      // 4. Request initial permission if needed to unlock device list
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
        // Stop stream tracks immediately so Html5Qrcode can attach its own stream
        stream.getTracks().forEach(t => t.stop());
      } catch (permErr: any) {
        if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
          throw new Error('Camera access was blocked. Please click the lock or camera icon in your browser address bar and select "Allow".');
        } else if (permErr.name === 'NotFoundError' || permErr.name === 'DevicesNotFoundError') {
          throw new Error('No camera hardware was detected on your device. You can upload an image or use Quick Barcode input.');
        } else if (permErr.name === 'NotReadableError' || permErr.name === 'TrackStartError') {
          throw new Error('Camera is already in use by another app (e.g. Zoom, Teams, or another browser tab). Please close it and retry.');
        } else if (permErr.name === 'SecurityError') {
          throw new Error('Camera access is restricted by the iframe permissions policy. Try opening the app in a standalone browser tab.');
        }
      }

      // 5. Enumerate available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
        }
      } catch (camErr) {
        console.log('Camera list notice:', camErr);
      }

      // 6. Initialize Html5Qrcode instance
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 220, height: 220 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A
        ]
      };

      const camId = specificCameraId || selectedCameraId;

      if (camId) {
        await html5QrCode.start(
          camId,
          config,
          (decodedText) => handleCodeDetected(decodedText),
          () => {}
        );
      } else {
        // Try environment camera first
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => handleCodeDetected(decodedText),
            () => {}
          );
        } catch (envErr) {
          console.warn('Environment camera unavailable, falling back to user/webcam:', envErr);
          // Fallback to user facing or default webcam
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => handleCodeDetected(decodedText),
            () => {}
          );
        }
      }

      setCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      setCameraActive(false);
      setCameraError(
        err?.message || 
        'Could not access camera. Please check your browser camera permissions or try the Image Upload tab.'
      );
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Flip or switch active camera lens
  const handleSwitchCamera = async (newCamId?: string) => {
    let targetId = newCamId;
    if (!targetId && availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      targetId = availableCameras[nextIndex].id;
    }
    if (targetId) {
      setSelectedCameraId(targetId);
      await startCameraScanner(targetId);
    }
  };

  // Stop Camera
  const stopCameraScanner = async () => {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (_) {
      } finally {
        isStoppingRef.current = false;
        scannerRef.current = null;
        setCameraActive(false);
      }
    }
  };

  // Image File Upload Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-upload-helper');
      const decodedResult = await html5QrCode.scanFile(file, true);
      await html5QrCode.clear();
      handleCodeDetected(decodedResult);
    } catch (err: any) {
      playSound('error');
      setFeedbackMessage({
        type: 'error',
        text: 'No readable QR code or barcode found in the uploaded image. Please try a clearer photo.'
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Manual input form submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleCodeDetected(manualCodeInput.trim());
    setManualCodeInput('');
  };

  // Lifecycle when modal opens/closes or changes tab
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'camera') {
        const timer = setTimeout(() => {
          startCameraScanner();
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      stopCameraScanner();
      setIdentifiedProduct(null);
      setScannedNotFoundCode(null);
      setFeedbackMessage(null);
    }
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <QrCode className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-base">QR & Barcode Component Scanner</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  LIVE READY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Scan warehouse components to identify part details and instantly update stock counts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute scanner beep' : 'Enable scanner beep'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                stopCameraScanner();
                onClose();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector & Tab Navigation Bar */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Primary Operations Workflow Switcher */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] font-mono text-slate-400 mr-1 hidden sm:inline">Operation:</span>
            <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono w-full sm:w-auto">
              <button
                onClick={() => setTerminalMode('MECHANIC_DEFECT')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  terminalMode === 'MECHANIC_DEFECT'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/50'
                    : 'text-amber-400/80 hover:bg-amber-500/10'
                }`}
                title="Mechanic scans defective part: Conveyor runs Forward 10s, JGB Gate opens 60° (1.5s open/return), Storekeeper notified"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>1. Mechanic Defect</span>
              </button>

              <button
                onClick={() => setTerminalMode('STOREKEEPER_ISSUE')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  terminalMode === 'STOREKEEPER_ISSUE'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/50'
                    : 'text-emerald-400/80 hover:bg-emerald-500/10'
                }`}
                title="Storekeeper scans new replacement: Inventory -1 stock, Conveyor runs Reverse 10s to Mechanic (no gates)"
              >
                <Package className="w-3.5 h-3.5" />
                <span>2. Storekeeper Issue</span>
              </button>

              <button
                onClick={() => setTerminalMode('INVENTORY_MANAGE')}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  terminalMode === 'INVENTORY_MANAGE'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50'
                    : 'text-cyan-400/80 hover:bg-cyan-500/10'
                }`}
                title="General Inventory: Restock In, Issue Out, Relocate rack, Audit count"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>3. Stock Manager</span>
              </button>
            </div>
          </div>

          {/* Input Method Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'camera'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'upload'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Image Upload</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'manual'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Manual / USB</span>
            </button>
          </div>
        </div>

        {/* Operational Context Sub-Banner */}
        <div className={`px-6 py-1.5 border-b text-xs font-mono flex items-center justify-between transition-colors ${
          terminalMode === 'MECHANIC_DEFECT'
            ? 'bg-amber-950/30 border-amber-900/40 text-amber-300'
            : terminalMode === 'STOREKEEPER_ISSUE'
            ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
            : 'bg-cyan-950/30 border-cyan-900/40 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-ping bg-current" />
            <span>
              {terminalMode === 'MECHANIC_DEFECT' && 'STEP 01: Mechanic scans Defect item (SP001 Bearing / SP002 DC Motor) → Forward 10s + JGB Gate 60° (1.5s open/return)'}
              {terminalMode === 'STOREKEEPER_ISSUE' && 'STEP 02: Storekeeper scans Replacement part → Inventory updates (-1 stock) + Reverse 10s to Mechanic (No gates)'}
              {terminalMode === 'INVENTORY_MANAGE' && 'INVENTORY: Scan component QR to restock, relocate rack, or update safety counts'}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold opacity-80">
            {terminalMode === 'MECHANIC_DEFECT' && 'Gate 01 (SP001) / Gate 02 (SP002)'}
            {terminalMode === 'STOREKEEPER_ISSUE' && 'Delivering via Reverse Conveyor'}
            {terminalMode === 'INVENTORY_MANAGE' && 'Audit Terminal'}
          </span>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 scrollbar-thin">
          
          {/* LEFT COLUMN: SCANNER VIEWPORT & INPUT (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            
            {/* Viewport Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[300px]">
              
              {activeTab === 'camera' && (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-w-[280px]">
                    {/* Viewport container - MUST BE EMPTY so Html5Qrcode never conflicts with React reconciliation */}
                    <div
                      id={containerId}
                      className="w-full rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-xl bg-black aspect-square flex items-center justify-center"
                    />

                    {/* Loading State Overlay */}
                    {!cameraActive && !cameraError && (
                      <div className="absolute inset-0 rounded-xl bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center pointer-events-none space-y-2">
                        <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
                        <p className="text-xs font-mono text-emerald-300 font-semibold">
                          {isRequestingPermission ? 'Requesting Camera Access...' : 'Initializing Camera Feed...'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Please approve camera permissions when prompted by your browser
                        </p>
                      </div>
                    )}

                    {/* HUD Target Overlay when active */}
                    {cameraActive && (
                      <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden flex flex-col justify-between p-3">
                        {/* Target Reticle Corners */}
                        <div className="flex justify-between items-start">
                          <div className="w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                          <div className="w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                        </div>

                        {/* Animated Laser Beam */}
                        <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scanLaser"></div>

                        {/* Center Target Crosshair Hint */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 border border-emerald-500/20 rounded-lg"></div>
                        </div>

                        <div className="flex justify-between items-end">
                          <div className="w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                          <div className="w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-sm shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {cameraError && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-200 text-xs font-mono space-y-2.5 text-center max-w-[320px]">
                      <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold">
                        <AlertCircle className="w-4 h-4" />
                        <span>Camera Access Notice</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">{cameraError}</p>
                      
                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          onClick={() => startCameraScanner()}
                          className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-950"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Retry / Allow Camera</span>
                        </button>

                        <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-2">
                          If running in an embedded preview frame:
                        </div>
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                        >
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                          <span>Open in Standalone Tab</span>
                        </a>

                        <button
                          onClick={() => setActiveTab('upload')}
                          className="text-[11px] text-cyan-400 hover:underline pt-0.5"
                        >
                          Or upload barcode photo instead →
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="mt-3 w-full flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>Camera Active — Align Barcode / QR in frame</span>
                      </div>

                      {/* Camera Controls & Switcher */}
                      <div className="flex items-center gap-2 mt-1">
                        {availableCameras.length > 1 && (
                          <button
                            onClick={() => handleSwitchCamera()}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
                            title="Switch to next camera lens"
                          >
                            <RefreshCw className="w-3 h-3 text-emerald-400" />
                            <span>Switch Camera ({availableCameras.length})</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (cameraActive) {
                              stopCameraScanner();
                            } else {
                              startCameraScanner();
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{cameraActive ? 'Pause Camera' : 'Resume Camera'}</span>
                        </button>
                      </div>

                      {/* Camera device selection dropdown if multiple cameras */}
                      {availableCameras.length > 1 && (
                        <div className="w-full max-w-[280px] mt-1">
                          <select
                            value={selectedCameraId}
                            onChange={(e) => handleSwitchCamera(e.target.value)}
                            aria-label="Select camera lens"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                          >
                            {availableCameras.map((cam, idx) => (
                              <option key={cam.id} value={cam.id}>
                                {cam.label || `Camera Lens ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {!cameraActive && !cameraError && (
                    <button
                      onClick={() => startCameraScanner()}
                      className="mt-3 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start Camera Stream</span>
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="w-full flex flex-col items-center justify-center py-6 px-4 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">Upload Component QR Image</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Upload a photo or screenshot containing a QR code or barcode
                    </p>
                  </div>
                  <label className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span>Choose QR Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {/* Invisible container needed by html5-qrcode scanFile */}
                  <div id="qr-upload-helper" className="hidden"></div>
                </div>
              )}

              {activeTab === 'manual' && (
                <div className="w-full flex flex-col items-center justify-center py-4 px-2 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Keyboard className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-200 text-sm">Barcode Reader / Keyboard Input</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Scan with connected USB/Bluetooth gun or type code
                    </p>
                  </div>

                  <form onSubmit={handleManualSubmit} className="w-full space-y-2">
                    <input
                      type="text"
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value)}
                      placeholder="e.g. 890123456789 or P-001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono py-2.5 rounded-xl transition-colors shadow-md"
                    >
                      Process Code
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Quick Demo Simulator Pills - Role Aware */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="font-bold text-slate-300">
                  {terminalMode === 'MECHANIC_DEFECT' && '🛠️ Mechanic Defect Test Scanners:'}
                  {terminalMode === 'STOREKEEPER_ISSUE' && '📦 Storekeeper Dispense Test Scanners:'}
                  {terminalMode === 'INVENTORY_MANAGE' && '⚡ 1-Click Inventory Test Codes:'}
                </span>
                <span className="text-[10px] text-emerald-400">Simulation Triggers</span>
              </div>

              {terminalMode === 'MECHANIC_DEFECT' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCodeDetected('SP001')}
                    disabled={isProcessing}
                    className="flex flex-col items-start p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl transition-all text-left shadow-sm group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Wrench className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
                      <span>SP001 — Bearing</span>
                    </div>
                    <span className="text-[10px] text-amber-400/80 font-mono mt-0.5">
                      → Gate 01 (Bin 1) | JGB 60° (1.5s) | Fwd 10s
                    </span>
                  </button>

                  <button
                    onClick={() => handleCodeDetected('SP002')}
                    disabled={isProcessing}
                    className="flex flex-col items-start p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl transition-all text-left shadow-sm group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Wrench className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
                      <span>SP002 — DC Motor</span>
                    </div>
                    <span className="text-[10px] text-indigo-400/80 font-mono mt-0.5">
                      → Gate 02 (Bin 2) | JGB 60° (1.5s) | Fwd 10s
                    </span>
                  </button>
                </div>
              ) : terminalMode === 'STOREKEEPER_ISSUE' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCodeDetected('SP001')}
                    disabled={isProcessing}
                    className="flex flex-col items-start p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl transition-all text-left shadow-sm group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Package className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Issue SP001 — Bearing</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                      → Stock -1 | Rev 10s to Mechanic (No Gates)
                    </span>
                  </button>

                  <button
                    onClick={() => handleCodeDetected('SP002')}
                    disabled={isProcessing}
                    className="flex flex-col items-start p-2.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-xl transition-all text-left shadow-sm group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Package className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
                      <span>Issue SP002 — DC Motor</span>
                    </div>
                    <span className="text-[10px] text-teal-400/80 font-mono mt-0.5">
                      → Stock -1 | Rev 10s to Mechanic (No Gates)
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleCodeDetected(p.barcode)}
                      className="text-[11px] font-mono bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      <span>{p.product_id}:</span>
                      <span className="font-bold">{p.product_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Live Conveyor & JGB Motor Telemetry Bar */}
            {liveOperation && liveOperation.conveyor_running && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3 space-y-2 text-xs font-mono shadow-lg shadow-emerald-950/40 animate-pulse">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4 animate-spin" />
                    <span>Conveyor Direction: {liveOperation.direction}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 rounded border border-emerald-500/30">
                    ⏳ {liveOperation.conveyor_remaining_sec}s remaining
                  </span>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, (liveOperation.conveyor_remaining_ms / liveOperation.duration_ms) * 100))}%` }}
                  />
                </div>

                {liveOperation.gate > 0 ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                    <span>Active Gate: <strong>Gate 0{liveOperation.gate}</strong> (JGB DC Motor)</span>
                    <span className="text-amber-300 font-bold">{liveOperation.gate_status}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    Sorting Gates: <strong>ALL CLOSED (0°)</strong> — Direct return to mechanic
                  </div>
                )}
              </div>
            )}

            {/* Status / Feedback Banner */}
            {feedbackMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 animate-in fade-in duration-150 ${
                  feedbackMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {feedbackMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">
                  {feedbackMessage.text}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: IDENTIFIED COMPONENT & INVENTORY UPDATE (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {identifiedProduct ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
                
                {/* Product Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-xs px-2.5 py-0.5 rounded">
                        {identifiedProduct.product_id}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        identifiedProduct.quantity <= 0 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : identifiedProduct.quantity <= identifiedProduct.minimum_stock 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {identifiedProduct.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight">
                      {identifiedProduct.product_name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {identifiedProduct.description || 'Industrial component registered in automated warehouse system'}
                    </p>
                  </div>

                  {onOpenLabelModal && (
                    <button
                      onClick={() => onOpenLabelModal(identifiedProduct)}
                      className="shrink-0 self-start sm:self-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View QR Label</span>
                    </button>
                  )}
                </div>

                {/* Key Metrics / Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-500 uppercase">Current Stock</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">
                      {identifiedProduct.quantity}
                    </div>
                    <div className="text-[10px] text-slate-400">Units in rack</div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-500 uppercase">Min Safety</div>
                    <div className="text-lg font-bold text-slate-200 mt-0.5">
                      {identifiedProduct.minimum_stock}
                    </div>
                    <div className="text-[10px] text-slate-400">Threshold</div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-500 uppercase">Rack Location</div>
                    <div className="text-base font-bold text-cyan-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{identifiedProduct.rack_location}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Storage shelf</div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-500 uppercase">Sorting Bin</div>
                    <div className="text-base font-bold text-purple-400 mt-0.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{identifiedProduct.sorting_bin}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Conveyor lane</div>
                  </div>
                </div>

                {/* Subsection Badge */}
                <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg text-slate-300">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Category: <strong>{identifiedProduct.category}</strong></span>
                  {identifiedProduct.subcategory && (
                    <>
                      <span className="text-slate-600">↳</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300 font-semibold">
                        {identifiedProduct.subcategory}
                      </span>
                    </>
                  )}
                  <span className="ml-auto text-slate-500">
                    Code: <strong className="text-slate-300">{identifiedProduct.barcode}</strong>
                  </span>
                </div>

                {/* Interactive Inventory Update Controls */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Update Inventory Level</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Direct warehouse sync</span>
                  </div>

                  {/* Action Mode Pills */}
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                    <button
                      onClick={() => { setUpdateAction('ADD_STOCK'); setQuantityInput(1); }}
                      className={`py-1.5 rounded-lg font-bold transition-all text-center ${
                        updateAction === 'ADD_STOCK'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      + Stock In
                    </button>
                    <button
                      onClick={() => { setUpdateAction('REMOVE_STOCK'); setQuantityInput(1); }}
                      className={`py-1.5 rounded-lg font-bold transition-all text-center ${
                        updateAction === 'REMOVE_STOCK'
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      - Stock Out
                    </button>
                    <button
                      onClick={() => { setUpdateAction('SET_STOCK'); setQuantityInput(identifiedProduct.quantity); }}
                      className={`py-1.5 rounded-lg font-bold transition-all text-center ${
                        updateAction === 'SET_STOCK'
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      = Audit Count
                    </button>
                    <button
                      onClick={() => setUpdateAction('RELOCATE')}
                      className={`py-1.5 rounded-lg font-bold transition-all text-center ${
                        updateAction === 'RELOCATE'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Move Rack
                    </button>
                  </div>

                  {/* Quantity & Preset Selectors */}
                  {updateAction !== 'RELOCATE' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">
                            {updateAction === 'SET_STOCK' ? 'Exact Count Quantity:' : 'Quantity to adjust:'}
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))}
                              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-base transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={updateAction === 'SET_STOCK' ? '0' : '1'}
                              value={quantityInput}
                              onChange={(e) => setQuantityInput(Number(e.target.value) || 0)}
                              className="w-24 text-center bg-slate-950 border border-slate-700 rounded-lg py-1.5 font-mono text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => setQuantityInput(quantityInput + 1)}
                              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-base transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        {updateAction !== 'SET_STOCK' && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-slate-500">Quick increments:</span>
                            <div className="flex gap-1 font-mono">
                              {[1, 5, 10, 25].map(amt => (
                                <button
                                  key={amt}
                                  onClick={() => setQuantityInput(amt)}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    quantityInput === amt
                                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold'
                                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  +{amt}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resulting Calculation Preview */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between">
                        <span className="text-slate-400">Projected stock after update:</span>
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="text-slate-400">{identifiedProduct.quantity}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className={`text-sm ${
                            updateAction === 'ADD_STOCK'
                              ? 'text-emerald-400'
                              : updateAction === 'REMOVE_STOCK'
                              ? 'text-rose-400'
                              : 'text-cyan-400'
                          }`}>
                            {updateAction === 'ADD_STOCK' 
                              ? identifiedProduct.quantity + quantityInput 
                              : updateAction === 'REMOVE_STOCK' 
                              ? Math.max(0, identifiedProduct.quantity - quantityInput) 
                              : quantityInput} Units
                          </span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Rack Relocation Selector */
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-slate-400">
                        Target Rack Location (Current: <strong className="text-white">{identifiedProduct.rack_location}</strong>):
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 font-mono">
                        {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'].map(rack => (
                          <button
                            key={rack}
                            onClick={() => setNewRackInput(rack)}
                            className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                              newRackInput === rack
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            Rack {rack}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes / Reason */}
                  <div>
                    <input
                      type="text"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Optional reference / notes (e.g. Batch intake, audit count, conveyor load)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Submit Update Button */}
                  <button
                    disabled={isProcessing}
                    onClick={() => {
                      executeDirectUpdate(
                        identifiedProduct,
                        updateAction,
                        quantityInput,
                        updateAction === 'SET_STOCK' ? quantityInput : undefined,
                        updateAction === 'RELOCATE' ? newRackInput : undefined,
                        notesInput
                      );
                    }}
                    className={`w-full py-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                      updateAction === 'ADD_STOCK'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                        : updateAction === 'REMOVE_STOCK'
                        ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                        : updateAction === 'SET_STOCK'
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    } disabled:opacity-50`}
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {updateAction === 'ADD_STOCK' && `Confirm Stock In (+${quantityInput} Units)`}
                      {updateAction === 'REMOVE_STOCK' && `Confirm Stock Out (-${quantityInput} Units)`}
                      {updateAction === 'SET_STOCK' && `Commit Audit Count (${quantityInput} Units)`}
                      {updateAction === 'RELOCATE' && `Move to Rack ${newRackInput}`}
                    </span>
                  </button>
                </div>
              </div>
            ) : scannedNotFoundCode ? (
              /* Scanned code not found empty state */
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 h-full">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Unregistered Component Scanned</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm">
                    The code <strong className="text-rose-400">"{scannedNotFoundCode}"</strong> was read but does not match any known warehouse item.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setScannedNotFoundCode(null);
                      setFeedbackMessage(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg transition-colors"
                  >
                    Scan Another Item
                  </button>
                </div>
              </div>
            ) : (
              /* Awaiting Scan Placeholder */
              <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[300px]">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-base">Awaiting Component Scan</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm">
                    Hold a component barcode or QR label in front of your camera or pick any item from the quick test list on the left.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-lg">
                  System recognizes Barcodes, Part IDs (P-001, P-004), and JSON QR tags
                </div>
              </div>
            )}

            {/* Session Scan History */}
            {scanHistory.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recent Updates This Session ({scanHistory.length})</span>
                  </div>
                  <button
                    onClick={() => setScanHistory([])}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    Clear History
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                  {scanHistory.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-[11px] font-mono bg-slate-900/80 border border-slate-800/80 px-2.5 py-1 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{entry.timestamp}</span>
                        <span className="text-emerald-400 font-bold">{entry.product_id}</span>
                        <span className="text-slate-200 truncate max-w-[140px]">{entry.product_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          entry.delta > 0 ? 'text-emerald-400' : entry.delta < 0 ? 'text-rose-400' : 'text-slate-300'
                        }`}>
                          {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                        </span>
                        <span className="text-slate-400 text-[10px]">(Now: {entry.new_quantity})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>QR Scanner Engine Active • ISO/IEC 18004 Standard Compatible</span>
          </div>

          <button
            onClick={() => {
              stopCameraScanner();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-bold"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
