import React, { useState } from 'react';
import { 
  Cpu, 
  Settings, 
  Terminal, 
  Radio, 
  Layers, 
  Play, 
  Zap, 
  BookOpen, 
  HelpCircle,
  Code,
  Cloud,
  ShieldCheck
} from 'lucide-react';
import { DeviceStatus } from '../types.js';

interface SettingsViewProps {
  devices: DeviceStatus[];
  onTriggerDeviceStatusUpdate: (device: string, updates: any) => Promise<void>;
  onTriggerConveyorCommand: (command: string, value: any) => Promise<void>;
}

export default function SettingsView({ 
  devices, 
  onTriggerDeviceStatusUpdate, 
  onTriggerConveyorCommand 
}: SettingsViewProps) {
  const [c3Status, setC3Status] = useState<'Online' | 'Offline'>('Online');
  const [s3Status, setS3Status] = useState<'Online' | 'Offline'>('Online');
  const [simOutput, setSimOutput] = useState('');

  const handleSimHeartbeat = async (device: 'ESP32-C3' | 'ESP32-S3', state: 'Online' | 'Offline') => {
    if (device === 'ESP32-C3') setC3Status(state);
    else setS3Status(state);

    try {
      await onTriggerDeviceStatusUpdate(device, { device_status: state });
      setSimOutput(`Successfully updated ${device} status to ${state}!`);
    } catch (err: any) {
      setSimOutput(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6" id="settings-view-root">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">ESP32 Pinout & System Configuration</h2>
        <p className="text-xs text-slate-400 font-mono mt-0.5">WIRING SHEETS, CONTROLLER PINMAPS, AND SYSTEM API DEFINITIONS</p>
      </div>

      {/* Controller Hardware Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ESP32-C3 Scanning Station */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-white text-sm">ESP32-C3 Mini: Request Station</h3>
                <p className="text-[10px] text-slate-400 font-mono">USER STATION SCANNER CONTROLLER</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              c3Status === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {c3Status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Pin Mapping & Wiring</h4>
            <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-900 font-mono text-[11px] space-y-2 text-slate-300">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-amber-500 font-bold">GPIO 4 (TX1)</span>
                <span>→ Barcode Scanner RX Pin</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-amber-500 font-bold">GPIO 5 (RX1)</span>
                <span>→ Barcode Scanner TX Pin</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-indigo-400 font-bold">GPIO 6</span>
                <span>→ Status LED Green (Scan OK / Ready)</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-indigo-400 font-bold">GPIO 7</span>
                <span>→ Status LED Red (Scan Fail / Locked)</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-emerald-500 font-bold">GPIO 8</span>
                <span>→ Piezo Buzzer Pin (Acoustic confirmation beep)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">3V3 / GND</span>
                <span>→ 3.3V Power Sourced from ESP Board</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed font-mono">
              <span className="font-bold text-white uppercase block mb-1">Process Overview:</span>
              Upon scanning an employee ID or defective barcode, the ESP32-C3 formats the payload and transmits it directly via Wi-Fi to the web application at <code className="text-amber-400">/api/esp/scan</code>.
            </div>
          </div>
        </div>

        {/* ESP32-S3 Conveyor & Sorter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-white text-sm">ESP32-S3: Automation Node</h3>
                <p className="text-[10px] text-slate-400 font-mono">CONVEYOR, SERVO, IR & RACK LIGHT SYSTEM</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              s3Status === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {s3Status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Pin Mapping & Wiring</h4>
            <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-900 font-mono text-[11px] space-y-2 text-slate-300">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-cyan-400 font-bold">GPIO 1 / GPIO 2</span>
                <span>→ Stepper Motor STEP / DIR Pins (Conveyor drive)</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-cyan-400 font-bold">GPIO 3</span>
                <span>→ Stepper Driver ENABLE Pin</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-amber-500 font-bold">GPIO 4</span>
                <span>→ Servo Motor PWM Signal (Sorting Chute Arm)</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-indigo-400 font-bold">GPIO 5</span>
                <span>→ Infrared Sensor 1 (Input, Gate Detection)</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-indigo-400 font-bold">GPIO 6</span>
                <span>→ Infrared Sensor 2 (Input, Sorter Entry Detection)</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-emerald-500 font-bold">GPIO 7 / 8</span>
                <span>→ Rack Indicator LED Outputs (B2, C1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">5V / GND</span>
                <span>→ External 5V Power Supply required for Stepper & Servo</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed font-mono">
              <span className="font-bold text-white uppercase block mb-1">Process Overview:</span>
              The ESP32-S3 polls <code className="text-cyan-400">/api/esp/commands</code> every 200ms to download current motor commands (e.g. SORT_ITEM, DELIVER_ITEM) and controls physical hardware.
            </div>
          </div>
        </div>

        {/* Firebase Durable Cloud Sync & Security Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Firebase Cloud Sync</h3>
                  <p className="text-[10px] text-slate-400 font-mono">DURABLE CLOUD-SYNC PERSISTENCE</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure Synchronization
              </h4>
              <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-900 font-mono text-[11px] space-y-2 text-slate-300">
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-sky-400 font-bold">PROJECT ID</span>
                  <span>inventory-app-e42a3</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-sky-400 font-bold">MODE</span>
                  <span>Real-time Dual-Write</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-emerald-400 font-bold">COLLECTIONS</span>
                  <span>employees, products</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-emerald-400 font-bold">COLLECTIONS</span>
                  <span>requests, transactions</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-emerald-400 font-bold">COLLECTIONS</span>
                  <span>device_status, esp_logs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">FAILOVER STATUS</span>
                  <span className="text-amber-500">Local Hot Standby</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed font-mono">
            <span className="font-bold text-white uppercase block mb-1">Architecture Overview:</span>
            Using high-contrast modular widgets, this portal integrates with Firebase Firestore. Any local status changes automatically replicate to the cloud, allowing secure, multi-client monitoring without downtime.
          </div>
        </div>

      </div>

      {/* Developer API Sandbox Simulation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4.5 h-4.5 text-emerald-500" /> Web-to-ESP Heartbeat Sandbox
        </h3>
        <p className="text-xs text-slate-400 font-mono">
          Simulate WiFi network losses or hardware disconnects to verify how the web dashboard registers failsafes.
        </p>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">ESP32-C3 Status</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleSimHeartbeat('ESP32-C3', 'Online')}
                className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[10px] uppercase font-bold"
              >
                Set Online
              </button>
              <button
                onClick={() => handleSimHeartbeat('ESP32-C3', 'Offline')}
                className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded font-mono text-[10px] uppercase font-bold"
              >
                Set Offline
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">ESP32-S3 Status</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleSimHeartbeat('ESP32-S3', 'Online')}
                className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[10px] uppercase font-bold"
              >
                Set Online
              </button>
              <button
                onClick={() => handleSimHeartbeat('ESP32-S3', 'Offline')}
                className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded font-mono text-[10px] uppercase font-bold"
              >
                Set Offline
              </button>
            </div>
          </div>
        </div>

        {simOutput && (
          <div className="p-3 bg-slate-950 rounded border border-slate-850 text-xs font-mono text-slate-300">
            {simOutput}
          </div>
        )}
      </div>

      {/* Setup Guide and System API schemas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4.5 h-4.5 text-indigo-400" /> End-to-End Commissioning & Integration Guide
        </h3>
        
        <div className="prose prose-invert prose-xs font-mono max-w-none text-slate-300 text-xs leading-relaxed space-y-4">
          <div>
            <span className="font-bold text-white uppercase block border-b border-slate-800 pb-1 mb-2">Step 1: Network Configuration</span>
            <p>
              Ensure the ESP32-C3 and ESP32-S3 are connected to the same local Wi-Fi subnet. In the firmware code, configure:
              <br />
              <code className="text-emerald-400 block p-2 bg-slate-950 rounded mt-1 border border-slate-900">
                #define WIFI_SSID "Factory_Automation_Net"<br />
                #define WIFI_PASS "SecureWLANPass"<br />
                #define WEB_SERVER_URL "https://ais-dev-mfgmj5dkdb2midnwsioxrc-492036914753.asia-east1.run.app"
              </code>
            </p>
          </div>

          <div>
            <span className="font-bold text-white uppercase block border-b border-slate-800 pb-1 mb-2">Step 2: Testing the Complete Loop</span>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-400">
              <li>Open the <span className="text-white font-bold">Dashboard Tab</span>. On the right, select <span className="text-white">EMP001 (Anjana)</span> and <span className="text-white">Bearings</span>. Click <span className="text-white font-bold">Trigger Barcode Scan</span>.</li>
              <li>Observe the Web Request log. A new request is instantly generated in <span className="text-amber-500">Pending</span> state.</li>
              <li>Observe the <span className="text-white">Conveyor Control Tab</span>. The conveyor will turn to <span className="text-amber-500">RECEIVING DEFECTIVE ITEM</span> mode (FORWARD direction).</li>
              <li>Go to the <span className="text-white">Requests Tab</span>. Click <span className="text-white">Confirm Defect Received</span>. This emulates S3 detecting the defect at the IR sensors.</li>
              <li>Observe the <span className="text-white">Defect Sorting Tab</span>. The item is visualised moving and the servo divert flap automatically matches <span className="text-cyan-400">Bin 1 (45°)</span> because Bearings is categorized as <span className="text-cyan-400">Mechanical</span>.</li>
              <li>After sorting, click <span className="text-white">Signal LED ON</span>. Observe the rack locator. LED ON for Rack B1 is now displayed in the active console.</li>
              <li>The storekeeper goes to the rack, retrieves the item, and clicks <span className="text-emerald-400">Confirm Delivery & Reverse Conveyor</span>.</li>
              <li>The conveyor direction switches to <span className="text-emerald-400">REVERSE</span> delivering the replacement part to the Technician.</li>
              <li>The stock for Bearings is automatically decremented from <span className="text-white font-bold">20</span> to <span className="text-white font-bold">19</span>.</li>
            </ol>
          </div>
        </div>
      </div>

    </div>
  );
}
