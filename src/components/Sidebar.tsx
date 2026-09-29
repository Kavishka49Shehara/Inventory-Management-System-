import React from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  Users, 
  ClipboardList, 
  RotateCcw, 
  ArrowLeftRight, 
  History, 
  BarChart3, 
  Settings,
  ShieldCheck,
  Key,
  LogOut,
  UserCheck,
  QrCode,
  Camera
} from 'lucide-react';
import { UserRole } from '../types.js';
import { UserSession } from './LoginPortalModal.js';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: UserSession | null;
  onOpenLoginModal: () => void;
  onOpenQRScanner?: () => void;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  userRole, 
  setUserRole, 
  currentUser,
  onOpenLoginModal,
  onOpenQRScanner 
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMINISTRATOR', 'STOREKEEPER', 'EMPLOYEE'] },
    { id: 'inventory', label: 'Inventory', icon: Boxes, roles: ['ADMINISTRATOR', 'STOREKEEPER'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['ADMINISTRATOR'] },
    { id: 'requests', label: 'Requests', icon: ClipboardList, roles: ['ADMINISTRATOR', 'STOREKEEPER', 'EMPLOYEE'] },
    { id: 'defective', label: 'Defect Sorting', icon: RotateCcw, roles: ['ADMINISTRATOR', 'STOREKEEPER'] },
    { id: 'conveyor', label: 'Conveyor Control', icon: ArrowLeftRight, roles: ['ADMINISTRATOR', 'STOREKEEPER'] },
    { id: 'transactions', label: 'Transactions', icon: History, roles: ['ADMINISTRATOR', 'STOREKEEPER'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['ADMINISTRATOR'] },
    { id: 'settings', label: 'Settings & ESP32', icon: Settings, roles: ['ADMINISTRATOR', 'STOREKEEPER', 'EMPLOYEE'] },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col h-screen select-none shrink-0" id="app-sidebar">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 font-bold text-lg shadow-lg shadow-emerald-500/20">
          SP
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight text-white uppercase tracking-wider">SpareParts Auto</h1>
          <p className="text-[10px] text-slate-400 font-mono">WAREHOUSE OS v2.4</p>
        </div>
      </div>

      {/* User Login Portals Session Box */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Current Session
          </span>
          <button
            onClick={onOpenLoginModal}
            className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1"
            title="Switch User Login Portal"
          >
            <Key className="w-3 h-3" /> Portals
          </button>
        </div>

        {currentUser ? (
          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">{currentUser.name}</span>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                {currentUser.role}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 truncate">{currentUser.department}</p>
            <p className="text-[9px] font-mono text-slate-500 flex items-center justify-between pt-0.5 border-t border-slate-800/60">
              <span>User: <strong className="text-slate-300">{currentUser.username}</strong></span>
              <span>ID: <strong className="text-slate-300">{currentUser.employee_id}</strong></span>
            </p>
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded text-xs uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Key className="w-3.5 h-3.5" /> Select Login Portal
          </button>
        )}

        {/* Role Switcher */}
        <div>
          <label className="text-[9px] font-mono text-slate-500 block uppercase mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Active System View Mode
            </span>
            {currentUser && currentUser.role !== 'ADMINISTRATOR' && (
              <span className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">Role Locked</span>
            )}
          </label>
          <select 
            id="role-select"
            value={userRole} 
            onChange={(e) => {
              const role = e.target.value as UserRole;
              if (currentUser?.role === 'EMPLOYEE' && role !== 'EMPLOYEE') {
                alert('Access Restricted: Employee portal users cannot access Storekeeper or Administrator view modes.');
                return;
              }
              if (currentUser?.role === 'STOREKEEPER' && role !== 'STOREKEEPER') {
                alert('Access Restricted: Storekeeper portal users cannot access Employee or Administrator view modes.');
                return;
              }
              setUserRole(role);
              const allowed = menuItems.find(item => item.id === currentTab)?.roles.includes(role);
              if (!allowed) {
                setCurrentTab('dashboard');
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500 font-medium transition-all"
          >
            <option 
              value="ADMINISTRATOR" 
              disabled={currentUser?.role === 'STOREKEEPER' || currentUser?.role === 'EMPLOYEE'}
            >
              🛡️ Administrator {currentUser?.role !== 'ADMINISTRATOR' ? '(Locked)' : ''}
            </option>
            <option 
              value="STOREKEEPER" 
              disabled={currentUser?.role === 'EMPLOYEE'}
            >
              🔑 Storekeeper {currentUser?.role === 'EMPLOYEE' ? '(Locked)' : ''}
            </option>
            <option 
              value="EMPLOYEE" 
              disabled={currentUser?.role === 'STOREKEEPER'}
            >
              🔧 Employee/Technician {currentUser?.role === 'STOREKEEPER' ? '(Locked)' : ''}
            </option>
          </select>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
        {menuItems.map((item) => {
          const isAllowed = item.roles.includes(userRole);
          const isActive = currentTab === item.id;
          
          if (!isAllowed) return null;

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-950" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Camera Scanner Action */}
      {onOpenQRScanner && (
        <div className="px-3 pb-2 pt-1 border-t border-slate-800/80">
          <button
            onClick={onOpenQRScanner}
            className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/35 px-3 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-sm group"
            title="Scan components using device camera"
          >
            <Camera className="w-4 h-4 group-hover:scale-110 transition-transform text-emerald-400" />
            <span>Scan with Camera</span>
          </button>
        </div>
      )}

      {/* Technical Footnote (Anti-ai-slop, clean minimal indicator) */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-center">
        <p className="text-[10px] font-mono text-slate-500">SYSTEM ID: G-617911</p>
        <p className="text-[9px] font-mono text-slate-600 mt-0.5">ESP32 Bidirectional Controller</p>
      </div>
    </aside>
  );
}
