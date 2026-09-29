import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.js';
import DashboardView from './components/DashboardView.js';
import InventoryView from './components/InventoryView.js';
import EmployeeView from './components/EmployeeView.js';
import RequestView from './components/RequestView.js';
import DefectSortingView from './components/DefectSortingView.js';
import ConveyorControlView from './components/ConveyorControlView.js';
import TransactionView from './components/TransactionView.js';
import ReportsView from './components/ReportsView.js';
import SettingsView from './components/SettingsView.js';
import LoginPortalModal, { UserSession } from './components/LoginPortalModal.js';
import QRScannerModal from './components/QRScannerModal.js';
import ProductQRLabelModal from './components/ProductQRLabelModal.js';
import ComponentQRSheetModal from './components/ComponentQRSheetModal.js';
import StorekeeperOperationBanner from './components/StorekeeperOperationBanner.js';
import { Key, UserCheck, QrCode, Camera, Wrench, Package } from 'lucide-react';
import { 
  Employee, 
  Product, 
  PartRequest, 
  Transaction, 
  DeviceStatus, 
  UserRole,
  ESP32CommandLog 
} from './types.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('ADMINISTRATOR');
  
  // User Login Session State (Defaulted to Administrator Kavishka)
  const [currentUser, setCurrentUser] = useState<UserSession | null>({
    id: 'emp-5',
    employee_id: 'ADM001',
    name: 'Kavishka',
    username: 'Adm Kavishka',
    role: 'ADMINISTRATOR',
    department: 'System Administration',
    position: 'System Administrator',
    barcode_id: 'ADM001'
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isGlobalQRScannerOpen, setIsGlobalQRScannerOpen] = useState<boolean>(false);
  const [isComponentQRSheetOpen, setIsComponentQRSheetOpen] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'MECHANIC_DEFECT' | 'STOREKEEPER_ISSUE' | 'INVENTORY_MANAGE'>('MECHANIC_DEFECT');
  const [globalQRLabelProduct, setGlobalQRLabelProduct] = useState<Product | null>(null);

  const openScannerWithMode = (mode: 'MECHANIC_DEFECT' | 'STOREKEEPER_ISSUE' | 'INVENTORY_MANAGE') => {
    setScannerMode(mode);
    setIsGlobalQRScannerOpen(true);
  };

  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
    setUserRole(user.role);
    // Auto redirect if current tab is restricted for the new user role
    if (user.role === 'EMPLOYEE') {
      const allowedTabs = ['dashboard', 'requests', 'settings'];
      if (!allowedTabs.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    } else if (user.role === 'STOREKEEPER') {
      const allowedTabs = ['dashboard', 'inventory', 'requests', 'defective', 'conveyor', 'transactions', 'settings'];
      if (!allowedTabs.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  };

  // Core Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [espLogs, setEspLogs] = useState<ESP32CommandLog[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalQuantity: 0,
    pendingRequests: 0,
    defectiveReturned: 0,
    completedTransactions: 0
  });

  const [loading, setLoading] = useState(true);

  // Load and refresh stats and lists
  const refreshData = async () => {
    try {
      const [
        statsRes,
        empRes,
        prodRes,
        reqRes,
        txRes,
        devRes,
        logRes
      ] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
        fetch('/api/requests').then(r => r.json()),
        fetch('/api/transactions').then(r => r.json()),
        fetch('/api/device-status').then(r => r.json()),
        fetch('/api/esp-logs').then(r => r.json())
      ]);

      setStats(statsRes);
      setEmployees(empRes);
      setProducts(prodRes);
      setRequests(reqRes);
      setTransactions(txRes);
      setDevices(devRes);
      setEspLogs(logRes);
    } catch (err) {
      console.error('Failed to load system state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Poll data every 3 seconds to mock real-time industrial scanner heartbeats
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  // API Callbacks

  // 1. Save/Edit Product
  const handleSaveProduct = async (productData: any) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save product');
    }
    await refreshData();
  };

  // 2. Delete Product
  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete product');
    }
    await refreshData();
  };

  // 3. Save/Edit Employee
  const handleSaveEmployee = async (employeeData: any) => {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save employee');
    }
    await refreshData();
  };

  // 4. Delete Employee
  const handleDeleteEmployee = async (id: string) => {
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete employee');
    }
    await refreshData();
  };

  // 5. Trigger Defect scan simulation from ESP32-C3
  const handleSimulateScan = async (employeeBarcode: string, productBarcode: string) => {
    const res = await fetch('/api/esp/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device: 'ESP32-C3',
        employee_barcode: employeeBarcode,
        product_barcode: productBarcode,
        event: 'NEW_REQUEST'
      })
    });
    const data = await res.json();
    if (data.status === 'REJECTED') {
      throw new Error(`Device Scan Rejected: ${data.reason}`);
    }
    await refreshData();
  };

  // 6. Update request status (Pending -> Defective Received -> Sorting etc)
  const handleTriggerStatusUpdate = async (id: string, status: PartRequest['status']) => {
    const res = await fetch(`/api/requests/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update request state');
    }
    await refreshData();
  };

  // 7. Storekeeper confirms delivery issue and reverses conveyor
  const handleConfirmIssue = async (id: string) => {
    const res = await fetch(`/api/requests/${id}/confirm-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storekeeper_id: 'STK_AUDIT' })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to complete transaction issue');
    }
    await refreshData();
  };

  // 8. Reject a Request
  const handleRejectRequest = async (id: string) => {
    const res = await fetch(`/api/requests/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Rejected' })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reject request');
    }
    await refreshData();
  };

  // 9. Send manual conveyor trigger
  const handleTriggerConveyorCommand = async (command: string, value: any) => {
    await fetch('/api/esp/conveyor-trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, value })
    });
    await refreshData();
  };

  // 10. Force update device statuses
  const handleTriggerDeviceStatusUpdate = async (deviceName: string, updates: any) => {
    await fetch('/api/device-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_name: deviceName,
        ...updates
      })
    });
    await refreshData();
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden" id="app-root-container">
      {/* Sidebar navigation and Switch role block */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        userRole={userRole} 
        setUserRole={setUserRole} 
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenQRScanner={() => setIsGlobalQRScannerOpen(true)}
      />

      {/* Main workspace frame */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-slate-950">
        
        {/* Top Minimal System Header */}
        <header className="h-16 border-b border-slate-900 px-8 flex items-center justify-between select-none shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              WEB PORTING INTEGRATION LINK ONLINE
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs font-mono">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Portal User:</span>
                <span className="font-bold text-white">{currentUser.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {currentUser.username}
                </span>
              </div>
            )}

            {/* Quick Mechanic Defect QR Scan */}
            <button
              onClick={() => openScannerWithMode('MECHANIC_DEFECT')}
              className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-sm"
              title="Step 01: Mechanic Scans Defective Item QR (SP001 / SP002)"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Mechanic Defect Scan</span>
              <span className="md:hidden">Defect</span>
            </button>

            {/* Quick Storekeeper Dispense QR Scan */}
            <button
              onClick={() => openScannerWithMode('STOREKEEPER_ISSUE')}
              className="bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/35 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-sm"
              title="Step 05: Storekeeper Scans Replacement Item QR to Issue (-1 Stock)"
            >
              <Package className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">Storekeeper Issue Scan</span>
              <span className="md:hidden">Issue</span>
            </button>

            {/* Scannable Component QR Codes Sheet Button */}
            <button
              onClick={() => setIsComponentQRSheetOpen(true)}
              className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/35 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-sm"
              title="View, Test, and Print All Scannable Component QR Codes"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">Component QRs</span>
              <span className="lg:hidden">QRs</span>
            </button>

            {/* Quick Camera & QR Barcode Scanner Button */}
            <button
              onClick={() => openScannerWithMode('INVENTORY_MANAGE')}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/35 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-sm"
              title="Use Camera to Scan Components"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Scan with Camera</span>
            </button>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>User Login Portals</span>
            </button>

            <div className="text-xs text-slate-500 font-mono">
              MODE: <span className="text-white font-bold">{userRole}</span>
            </div>
          </div>
        </header>

        {/* Dynamic page container */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          {/* Live Storekeeper Notification & Conveyor Progress Banner across all views */}
          <StorekeeperOperationBanner 
            onOpenScanner={openScannerWithMode}
            onRefreshData={refreshData}
            products={products}
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-xs gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-t-emerald-500 border-slate-800 animate-spin" />
              <span>Booting Warehouse OS Database...</span>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView 
                  stats={stats} 
                  requests={requests} 
                  products={products}
                  employees={employees}
                  onConfirmIssue={handleConfirmIssue}
                  onRejectRequest={handleRejectRequest}
                  onSimulateScan={handleSimulateScan}
                  onTriggerStatusUpdate={handleTriggerStatusUpdate}
                />
              )}

              {currentTab === 'inventory' && (
                <InventoryView 
                  products={products} 
                  onSaveProduct={handleSaveProduct} 
                  onDeleteProduct={handleDeleteProduct} 
                  onRefreshData={refreshData}
                  currentUser={currentUser}
                  onOpenScanner={() => setIsGlobalQRScannerOpen(true)}
                  onOpenQRSheet={() => setIsComponentQRSheetOpen(true)}
                />
              )}

              {currentTab === 'employees' && (
                <EmployeeView 
                  employees={employees} 
                  onSaveEmployee={handleSaveEmployee} 
                  onDeleteEmployee={handleDeleteEmployee} 
                />
              )}

              {currentTab === 'requests' && (
                <RequestView 
                  requests={requests} 
                  products={products}
                  onConfirmIssue={handleConfirmIssue}
                  onRejectRequest={handleRejectRequest}
                  onTriggerStatusUpdate={handleTriggerStatusUpdate}
                />
              )}

              {currentTab === 'defective' && (
                <DefectSortingView 
                  requests={requests} 
                  transactions={transactions} 
                />
              )}

              {currentTab === 'conveyor' && (
                <ConveyorControlView 
                  devices={devices} 
                  espLogs={espLogs}
                  onTriggerConveyorCommand={handleTriggerConveyorCommand}
                  onTriggerDeviceStatusUpdate={handleTriggerDeviceStatusUpdate}
                />
              )}

              {currentTab === 'transactions' && (
                <TransactionView 
                  transactions={transactions} 
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView 
                  products={products} 
                  transactions={transactions} 
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView 
                  devices={devices} 
                  onTriggerDeviceStatusUpdate={handleTriggerDeviceStatusUpdate}
                  onTriggerConveyorCommand={handleTriggerConveyorCommand}
                />
              )}
            </>
          )}
        </div>

      </main>

      {/* Login Portals Modal */}
      <LoginPortalModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
      />

      {/* Global QR & Barcode Component Scanner Modal */}
      <QRScannerModal
        isOpen={isGlobalQRScannerOpen}
        onClose={() => setIsGlobalQRScannerOpen(false)}
        products={products}
        onRefreshData={refreshData}
        currentUser={currentUser}
        initialMode={scannerMode}
        onOpenLabelModal={(product) => {
          setIsGlobalQRScannerOpen(false);
          setGlobalQRLabelProduct(product);
        }}
      />

      {/* Global Product QR Label & Print Modal */}
      <ProductQRLabelModal
        product={globalQRLabelProduct}
        isOpen={!!globalQRLabelProduct}
        onClose={() => setGlobalQRLabelProduct(null)}
        onOpenScanner={() => {
          setGlobalQRLabelProduct(null);
          setIsGlobalQRScannerOpen(true);
        }}
      />

      {/* Scannable Component QR Codes Sheet & Gallery Modal */}
      <ComponentQRSheetModal
        isOpen={isComponentQRSheetOpen}
        onClose={() => setIsComponentQRSheetOpen(false)}
        products={products}
        employees={employees}
        onOpenScanner={() => {
          setIsComponentQRSheetOpen(false);
          setIsGlobalQRScannerOpen(true);
        }}
      />
    </div>
  );
}
