import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Key, 
  UserCheck, 
  X, 
  Lock, 
  User, 
  Cpu, 
  Wrench, 
  Layers, 
  Boxes, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { UserRole } from '../types.js';

export interface UserSession {
  id: string;
  employee_id: string;
  name: string;
  username: string;
  role: UserRole;
  department: string;
  position: string;
  barcode_id: string;
}

interface LoginPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSession) => void;
  currentUser?: UserSession | null;
}

export default function LoginPortalModal({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser
}: LoginPortalModalProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Preset Portal Accounts requested by the user
  const portals = [
    {
      name: 'Anjana',
      department: 'System Engineering',
      username: 'Anjana SE',
      password: '1111',
      role: 'EMPLOYEE' as UserRole,
      position: 'System Engineer',
      employee_id: 'EMP001',
      icon: Cpu,
      color: 'from-cyan-500/20 to-cyan-950/40 border-cyan-500/40 text-cyan-400',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      name: 'Thisraka',
      department: 'Maintenance',
      username: 'Thisraka M',
      password: '2222',
      role: 'EMPLOYEE' as UserRole,
      position: 'Maintenance Engineer',
      employee_id: 'EMP002',
      icon: Wrench,
      color: 'from-blue-500/20 to-blue-950/40 border-blue-500/40 text-blue-400',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      name: 'Nikini',
      department: 'Operations',
      username: 'Nikini O',
      password: '3333',
      role: 'EMPLOYEE' as UserRole,
      position: 'Operations Officer',
      employee_id: 'EMP003',
      icon: Layers,
      color: 'from-purple-500/20 to-purple-950/40 border-purple-500/40 text-purple-400',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      name: 'Inshaf',
      department: 'Storekeeping',
      username: 'SK inshaf',
      password: '4444',
      role: 'STOREKEEPER' as UserRole,
      position: 'Head Storekeeper',
      employee_id: 'STK001',
      icon: Boxes,
      color: 'from-amber-500/20 to-amber-950/40 border-amber-500/40 text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      name: 'Kavishka',
      department: 'System Administration',
      username: 'Adm Kavishka',
      password: '1234',
      role: 'ADMINISTRATOR' as UserRole,
      position: 'System Administrator',
      employee_id: 'ADM001',
      icon: ShieldCheck,
      color: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/40 text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  ];

  const handleSelectPortal = (p: typeof portals[0]) => {
    setUsernameInput(p.username);
    setPasswordInput('');
    setErrorMsg('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const selectedPortal = portals.find(p => p.username.toLowerCase() === usernameInput.trim().toLowerCase());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput) {
      setErrorMsg('Please select or enter a Portal Username.');
      return;
    }
    if (!passwordInput) {
      setErrorMsg('Password is required. Please enter the password for this portal account.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check password.');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col scrollbar-thin">
        
        {/* Header Bar */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                User Authentication & Login Portals
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SYSTEM READY
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Select your user portal below or sign in using your portal username & password
              </p>
            </div>
          </div>

          {currentUser && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="Close Portal Modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Portal Body */}
        <div className="p-6 space-y-6">
          
          {/* Top Portals Banner / Quick Portal Grid */}
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Available User Login Portals
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {portals.map((p) => {
                const IconComponent = p.icon;
                const isSelected = usernameInput === p.username;

                return (
                  <div
                    key={p.username}
                    onClick={() => handleSelectPortal(p)}
                    className={`p-4 rounded-xl border bg-gradient-to-b cursor-pointer transition-all duration-200 flex flex-col justify-between relative group ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10'
                        : ''
                    } ${p.color}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border uppercase ${p.badge}`}>
                          {p.role}
                        </span>
                        <IconComponent className="w-4 h-4 opacity-70" />
                      </div>

                      <h4 className="font-bold text-white text-sm leading-tight">{p.name}</h4>
                      <p className="text-[11px] font-mono opacity-80 mt-0.5">{p.department}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between text-slate-300">
                        <span>Username:</span>
                        <span className="font-bold text-white">{p.username}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Password:</span>
                        <span className="font-medium text-slate-500 font-mono">•••••••• (Private)</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPortal(p);
                        }}
                        className={`w-full mt-2.5 py-1.5 px-2 rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1 border ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900/90 hover:bg-emerald-500 hover:text-slate-950 text-white border-slate-700/80'
                        }`}
                      >
                        {isSelected ? 'Selected (Enter Password)' : 'Select Portal'} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Divider */}
          <div className="relative border-t border-slate-800 my-4 text-center">
            <span className="bg-slate-900 px-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest relative -top-2.5">
              ENTER PASSWORD TO AUTHENTICATE PORTAL ACCESS
            </span>
          </div>

          {/* Form & Current Session */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Login Form */}
            <form onSubmit={handleLogin} className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              
              {selectedPortal && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Selected: <strong className="text-white">{selectedPortal.name}</strong> ({selectedPortal.username})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                    Role: {selectedPortal.role}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-500" /> Portal Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anjana SE, SK inshaf, Adm Kavishka"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-500" /> Enter Password *
                </label>
                <input
                  ref={passwordInputRef}
                  type="password"
                  required
                  placeholder="Enter account password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[10px] font-mono text-slate-500">
                  Secured BY Warehouse OS Authentication
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  {loading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In To Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Reference Box */}
            <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                System User Directory Quick Sheet
              </h4>

              <div className="space-y-2 text-[11px] font-mono text-slate-300 divide-y divide-slate-850">
                <div className="pt-1.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white">Anjana</span>
                    <span className="text-[10px] text-slate-400 block">System Engineering</span>
                  </div>
                  <span className="text-emerald-400 font-bold">User: Anjana SE</span>
                </div>

                <div className="pt-1.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white">Thisraka</span>
                    <span className="text-[10px] text-slate-400 block">Maintenance</span>
                  </div>
                  <span className="text-blue-400 font-bold">User: Thisraka M</span>
                </div>

                <div className="pt-1.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white">Nikini</span>
                    <span className="text-[10px] text-slate-400 block">Operations</span>
                  </div>
                  <span className="text-purple-400 font-bold">User: Nikini O</span>
                </div>

                <div className="pt-1.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white">Inshaf</span>
                    <span className="text-[10px] text-slate-400 block">Storekeeper</span>
                  </div>
                  <span className="text-amber-400 font-bold">User: SK inshaf</span>
                </div>

                <div className="pt-1.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white">Kavishka</span>
                    <span className="text-[10px] text-slate-400 block">Administrator</span>
                  </div>
                  <span className="text-emerald-400 font-bold">User: Adm Kavishka</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
