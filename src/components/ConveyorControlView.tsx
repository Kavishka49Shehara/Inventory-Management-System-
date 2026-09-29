import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Activity, 
  Play, 
  Square, 
  RotateCcw, 
  Cpu, 
  Terminal,
  Zap,
  Radio,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Package,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { DeviceStatus, ConveyorStatus, ESP32CommandLog, ActiveOperation } from '../types.js';

interface ConveyorControlProps {
  devices: DeviceStatus[];
  espLogs: ESP32CommandLog[];
  onTriggerConveyorCommand: (command: string, value: any) => Promise<void>;
  onTriggerDeviceStatusUpdate: (device: string, updates: any) => Promise<void>;
}

export default function ConveyorControlView({ 
  devices, 
  espLogs, 
  onTriggerConveyorCommand,
  onTriggerDeviceStatusUpdate
}: ConveyorControlProps) {
  const [speed, setSpeed] = useState(60); // 0-100 %
  const [selectedDirection, setSelectedDirection] = useState<'FORWARD' | 'REVERSE'>('FORWARD');
  const [conveyorState, setConveyorState] = useState<ConveyorStatus>('IDLE');
  
  // Simulation console state
  const [simSensor1, setSimSensor1] = useState(false);
  const [simSensor2, setSimSensor2] = useState(false);

  // Live operation telemetry
  const [liveOperation, setLiveOperation] = useState<ActiveOperation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedFirmware, setCopiedFirmware] = useState(false);
  const [firmwareCode, setFirmwareCode] = useState<string>('');
  const [showFirmwareModal, setShowFirmwareModal] = useState(false);

  const s3Device = devices.find(d => d.device_name === 'ESP32-S3');
  const currentStatus = s3Device ? s3Device.conveyor_status : 'IDLE';

  const fetchLiveOperation = async () => {
    try {
      const res = await fetch('/api/operations/active');
      if (res.ok) {
        const data = await res.json();
        setLiveOperation(data);
      }
    } catch (_) {}
  };

  const fetchFirmware = async () => {
    try {
      const res = await fetch('/api/esp/firmware-snippet');
      if (res.ok) {
        const text = await res.text();
        setFirmwareCode(text);
      }
    } catch (_) {}
  };

  useEffect(() => {
    setConveyorState(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    fetchLiveOperation();
    fetchFirmware();
    const interval = setInterval(fetchLiveOperation, 800);
    return () => clearInterval(interval);
  }, []);

  const handleManualTrigger = async (mode: 'START_FORWARD' | 'START_REVERSE' | 'HALT' | 'SET_SPEED') => {
    let payloadCmd = '';
    let payloadVal: any = {};

    if (mode === 'START_FORWARD') {
      payloadCmd = 'CONVEYOR_RUN';
      payloadVal = { direction: 'FORWARD', speed };
      setConveyorState('RECEIVING DEFECTIVE ITEM');
      await onTriggerDeviceStatusUpdate('ESP32-S3', { conveyor_status: 'RECEIVING DEFECTIVE ITEM', sensor_status: 'Manual Override Run | FORWARD direction' });
    } else if (mode === 'START_REVERSE') {
      payloadCmd = 'CONVEYOR_RUN';
      payloadVal = { direction: 'REVERSE', speed };
      setConveyorState('DELIVERING REPLACEMENT');
      await onTriggerDeviceStatusUpdate('ESP32-S3', { conveyor_status: 'DELIVERING REPLACEMENT', sensor_status: 'Manual Override Run | REVERSE direction' });
    } else if (mode === 'HALT') {
      payloadCmd = 'CONVEYOR_STOP';
      payloadVal = { halt: true };
      setConveyorState('IDLE');
      await onTriggerDeviceStatusUpdate('ESP32-S3', { conveyor_status: 'IDLE', sensor_status: 'Emergency Halt Signal' });
      await fetch('/api/operations/reset-active', { method: 'POST' });
      await fetchLiveOperation();
    } else if (mode === 'SET_SPEED') {
      payloadCmd = 'SPEED_ADJUST';
      payloadVal = { value: speed };
    }

    try {
      await onTriggerConveyorCommand(payloadCmd, payloadVal);
    } catch (err: any) {
      alert('Failed to transmit command');
    }
  };

  const handleSimSensorTrigger = async (sensor: 'IR1' | 'IR2', state: boolean) => {
    if (sensor === 'IR1') {
      setSimSensor1(state);
      await onTriggerDeviceStatusUpdate('ESP32-S3', { 
        sensor_status: `IR1: ${state ? 'DETECTED' : 'Clear'} | IR2: ${simSensor2 ? 'DETECTED' : 'Clear'}` 
      });
    } else {
      setSimSensor2(state);
      await onTriggerDeviceStatusUpdate('ESP32-S3', { 
        sensor_status: `IR1: ${simSensor1 ? 'DETECTED' : 'Clear'} | IR2: ${state ? 'DETECTED' : 'Clear'}` 
      });
    }
  };

  const triggerStepMechanic = async (code: 'SP001' | 'SP002') => {
    setIsProcessing(true);
    try {
      await fetch('/api/operations/mechanic-scan-defect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      await fetchLiveOperation();
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerStepStorekeeper = async (code: 'SP001' | 'SP002') => {
    setIsProcessing(true);
    try {
      await fetch('/api/operations/storekeeper-scan-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      await fetchLiveOperation();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCode = () => {
    if (firmwareCode) {
      navigator.clipboard.writeText(firmwareCode);
      setCopiedFirmware(true);
      setTimeout(() => setCopiedFirmware(false), 2000);
    }
  };

  const isForward = liveOperation?.type === 'MECHANIC_DEFECT_INTAKE' && liveOperation.conveyor_running;
  const isReverse = liveOperation?.type === 'STOREKEEPER_DISPENSE' && liveOperation.conveyor_running;
  const remainingSec = liveOperation?.conveyor_remaining_sec ?? 0;

  return (
    <div className="space-y-6" id="conveyor-control-root">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Bidirectional Conveyor Control</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            ESP32 DEV KIT • 10s RUNTIME • JGB MOTOR TIMED SORTING GATES (1.5s OPEN / 1.5s RETURN)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFirmwareModal(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            <span>ESP32 Arduino Firmware</span>
          </button>
        </div>
      </div>

      {/* 6-Step Workflow Telemetry & Quick Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2 font-mono">
            <ArrowLeftRight className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Automated 6-Step Operation Execution</span>
          </h3>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Direction:</span>
            <span className={`px-2.5 py-0.5 rounded font-bold uppercase ${
              isForward ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              isReverse ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              'bg-slate-950 text-slate-500 border border-slate-800'
            }`}>
              {isForward ? `FORWARD (${remainingSec}s remaining)` :
               isReverse ? `REVERSE (${remainingSec}s remaining)` :
               'STOPPED'}
            </span>
          </div>
        </div>

        {/* Dynamic 2-Way Animated Conveyor Belt */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-6 relative">
          <div className="h-28 flex items-center justify-between relative px-6 sm:px-12">
            
            {/* ST1: Mechanic */}
            <div className={`flex flex-col items-center z-10 transition-transform ${isForward ? 'scale-105' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-mono text-xs font-bold shadow-lg ${
                isForward 
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30 animate-pulse' 
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1.5 uppercase font-bold">ST1: Mechanic</span>
              <span className="text-[9px] font-mono text-slate-600">Defect QR Intake</span>
            </div>

            {/* Conveyor Arrow Flow Track */}
            <div className="flex-1 mx-6 h-4 bg-slate-900 border border-slate-800 rounded-full relative overflow-hidden flex items-center shadow-inner">
              {isForward && (
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,#f59e0b_50%)] bg-[length:24px_100%] animate-[flowForward_0.8s_linear_infinite]" />
              )}
              {isReverse && (
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,#10b981_50%)] bg-[length:24px_100%] animate-[flowReverse_0.8s_linear_infinite]" />
              )}
              {!isForward && !isReverse && (
                <div className="w-full text-center text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                  CONVEYOR BELT STOPPED (AWAITING SCAN)
                </div>
              )}
            </div>

            {/* ST2: Storekeeper */}
            <div className={`flex flex-col items-center z-10 transition-transform ${isReverse ? 'scale-105' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-mono text-xs font-bold shadow-lg ${
                isReverse 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-emerald-500/30 animate-pulse' 
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1.5 uppercase font-bold">ST2: Storekeeper</span>
              <span className="text-[9px] font-mono text-slate-600">Issue & Deliver</span>
            </div>

          </div>

          {/* JGB Gate Diverters Telemetry Overlay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-900 pt-4 mt-2">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">JGB GATE 01 (SP001 BEARING ➔ BIN 1):</span>
                <span className="font-bold text-white mt-0.5 block">
                  {liveOperation?.gate === 1 && isForward ? liveOperation.gate_status : '0° Initial Position (Closed)'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                liveOperation?.gate === 1 && isForward ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-950 text-slate-500'
              }`}>
                {liveOperation?.gate === 1 && isForward ? 'ACTUATING' : 'READY'}
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">JGB GATE 02 (SP002 DC MOTOR ➔ BIN 2):</span>
                <span className="font-bold text-white mt-0.5 block">
                  {liveOperation?.gate === 2 && isForward ? liveOperation.gate_status : '0° Initial Position (Closed)'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                liveOperation?.gate === 2 && isForward ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-950 text-slate-500'
              }`}>
                {liveOperation?.gate === 2 && isForward ? 'ACTUATING' : 'READY'}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Click Operations Trigger Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <button
            onClick={() => triggerStepMechanic('SP001')}
            disabled={isProcessing}
            className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl transition-all text-left flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Wrench className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              <span>Mechanic: SP001 Defect</span>
            </div>
            <span className="text-[10px] text-amber-400/80 mt-1">
              Bearing ➔ Gate 01 60° (1.5s/1.5s) | Fwd 10s
            </span>
          </button>

          <button
            onClick={() => triggerStepMechanic('SP002')}
            disabled={isProcessing}
            className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl transition-all text-left flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Wrench className="w-4 h-4 text-indigo-400 group-hover:rotate-45 transition-transform" />
              <span>Mechanic: SP002 Defect</span>
            </div>
            <span className="text-[10px] text-indigo-400/80 mt-1">
              DC Motor ➔ Gate 02 60° (1.5s/1.5s) | Fwd 10s
            </span>
          </button>

          <button
            onClick={() => triggerStepStorekeeper('SP001')}
            disabled={isProcessing}
            className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl transition-all text-left flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Package className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Storekeeper: Issue SP001</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-1">
              Bearing ➔ Stock -1 | Rev 10s (Gates Closed)
            </span>
          </button>

          <button
            onClick={() => triggerStepStorekeeper('SP002')}
            disabled={isProcessing}
            className="p-3 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl transition-all text-left flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Package className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
              <span>Storekeeper: Issue SP002</span>
            </div>
            <span className="text-[10px] text-teal-400/80 mt-1">
              DC Motor ➔ Stock -1 | Rev 10s (Gates Closed)
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* IR Sensors and Manual Console (Col 1 & 2) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-5">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4.5 h-4.5 text-emerald-500" /> Photoelectric Sensors & Chute Detection
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500">Conveyor Status: </span>
                <span className="px-2 py-0.5 bg-slate-950 text-emerald-400 font-bold rounded border border-slate-850 uppercase tracking-wide">
                  {conveyorState}
                </span>
              </div>
            </div>

            {/* IR Sensors LED indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                <div className={`w-4 h-4 rounded-full shrink-0 ${simSensor1 ? 'bg-amber-500 animate-ping border border-amber-300' : 'bg-slate-800 border border-slate-700'}`} />
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">IR Sensor 1 (Mechanic Port)</div>
                  <div className="text-xs font-semibold text-white mt-0.5">{simSensor1 ? 'OBSTACLE DETECTED' : 'CLEAR'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                <div className={`w-4 h-4 rounded-full shrink-0 ${simSensor2 ? 'bg-indigo-500 animate-ping border border-indigo-300' : 'bg-slate-800 border border-slate-700'}`} />
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">IR Sensor 2 (Gate Chutes)</div>
                  <div className="text-xs font-semibold text-white mt-0.5">{simSensor2 ? 'OBSTACLE DETECTED' : 'CLEAR'}</div>
                </div>
              </div>
            </div>

            {/* IR Sensors Interactive simulation buttons */}
            <div className="border-t border-slate-850 pt-4 mt-5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-2.5">Simulate Hardware IR triggers</span>
              <div className="flex flex-wrap gap-3">
                <button
                  onMouseDown={() => handleSimSensorTrigger('IR1', true)}
                  onMouseUp={() => handleSimSensorTrigger('IR1', false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-mono font-medium text-slate-300 transition-colors uppercase flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Trigger IR 1 Block
                </button>
                <button
                  onMouseDown={() => handleSimSensorTrigger('IR2', true)}
                  onMouseUp={() => handleSimSensorTrigger('IR2', false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs font-mono font-medium text-slate-300 transition-colors uppercase flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-400" /> Trigger IR 2 Block
                </button>
              </div>
              <span className="text-[9px] font-mono text-slate-600 block mt-2">Hold down mouse buttons to keep sensors active</span>
            </div>
          </div>
        </div>

        {/* Manual Speed & Controller console (Col 3) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Manual Console</h3>
                <p className="text-[10px] text-slate-400 font-mono">CONVEYOR DIRECTIVE CHANNELS</p>
              </div>
            </div>

            {/* Motor speed adjuster slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                <span>CONVEYOR MOTOR SPEED:</span>
                <span className="font-bold text-white">{speed} %</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={speed}
                onChange={(e) => {
                  setSpeed(Number(e.target.value));
                  handleManualTrigger('SET_SPEED');
                }}
                className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800"
              />
            </div>

            {/* Direction Selector */}
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">Pre-set Direction Mode</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedDirection('FORWARD')}
                  className={`py-2 px-3.5 rounded text-xs font-mono font-medium transition-colors border ${
                    selectedDirection === 'FORWARD' 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white'
                  }`}
                >
                  FORWARD (Defect)
                </button>
                <button
                  onClick={() => setSelectedDirection('REVERSE')}
                  className={`py-2 px-3.5 rounded text-xs font-mono font-medium transition-colors border ${
                    selectedDirection === 'REVERSE' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-white'
                  }`}
                >
                  REVERSE (Issue)
                </button>
              </div>
            </div>

            {/* Run controls */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleManualTrigger(selectedDirection === 'FORWARD' ? 'START_FORWARD' : 'START_REVERSE')}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Execute Manual Run
              </button>
              <button
                onClick={() => handleManualTrigger('HALT')}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> EMERGENCY STOP
              </button>
            </div>

          </div>

          {/* Device Heartbeats */}
          <div className="border-t border-slate-800 pt-4 mt-5">
            <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-widest">ESP32-S3 Polling Endpoint:</span>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-900 font-mono text-[10px] space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Commands API:</span>
                <span className="text-white">GET /api/esp/commands</span>
              </div>
              <div className="flex justify-between">
                <span>Defect Intake:</span>
                <span className="text-amber-400">POST /api/operations/mechanic-scan-defect</span>
              </div>
              <div className="flex justify-between">
                <span>Issue & Deliver:</span>
                <span className="text-emerald-400">POST /api/operations/storekeeper-scan-issue</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Terminal log section for serial packets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <Terminal className="w-4.5 h-4.5 text-indigo-400" /> ESP32 Real-Time Communication Command Stream
        </h3>
        <p className="text-xs text-slate-400 mb-3 font-mono">
          Logs all active HTTP/REST and Socket command frames sent from this server to ESP32 Dev Kit.
        </p>
        
        <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-400 space-y-2 max-h-48 overflow-y-auto border border-slate-850 scrollbar-thin">
          {espLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-4">No command stream logged yet</div>
          ) : (
            espLogs.map((log) => (
              <div key={log.id} className="flex gap-2.5 py-1 border-b border-slate-900/50 leading-relaxed">
                <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`font-bold shrink-0 ${log.type === 'RECEIVED' ? 'text-amber-500' : 'text-cyan-400'}`}>
                  [{log.type}]
                </span>
                <span className="text-white shrink-0 font-semibold">{log.device}:</span>
                <span className="text-slate-300 font-mono break-all">{JSON.stringify(log.payload)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ESP32 Arduino Firmware Modal */}
      {showFirmwareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 font-mono text-xs">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">ESP32 Dev Kit Firmware (Bidirectional Conveyor & JGB Gates)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedFirmware ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFirmware ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={() => setShowFirmwareModal(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-300 scrollbar-thin">
              <pre className="whitespace-pre-wrap leading-relaxed">{firmwareCode}</pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
