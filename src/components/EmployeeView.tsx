import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  X, 
  ShieldAlert,
  Calendar,
  Phone
} from 'lucide-react';
import { Employee } from '../types.js';

interface EmployeeViewProps {
  employees: Employee[];
  onSaveEmployee: (employee: any) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
}

export default function EmployeeView({ employees, onSaveEmployee, onDeleteEmployee }: EmployeeViewProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [authFilter, setAuthFilter] = useState('ALL');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form states
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMINISTRATOR' | 'STOREKEEPER' | 'EMPLOYEE'>('EMPLOYEE');
  const [barcodeId, setBarcodeId] = useState('');
  const [department, setDepartment] = useState('Maintenance');
  const [position, setPosition] = useState('');
  const [contact, setContact] = useState('');
  const [authorized, setAuthorized] = useState<boolean>(true);

  const openAddModal = () => {
    setEditingEmployee(null);
    setEmployeeId('');
    setName('');
    setUsername('');
    setPassword('');
    setRole('EMPLOYEE');
    setBarcodeId('');
    setDepartment('Maintenance');
    setPosition('');
    setContact('');
    setAuthorized(true);
    setIsOpen(true);
  };

  const openEditModal = (e: Employee) => {
    setEditingEmployee(e);
    setEmployeeId(e.employee_id);
    setName(e.name);
    setUsername(e.username || '');
    setPassword(e.password || '');
    setRole(e.role || 'EMPLOYEE');
    setBarcodeId(e.barcode_id);
    setDepartment(e.department);
    setPosition(e.position);
    setContact(e.contact);
    setAuthorized(e.authorization_status === 'Authorized');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !employeeId) {
      alert('Please fill out all required fields');
      return;
    }

    const payload: any = {
      employee_id: employeeId,
      name,
      username: username || name,
      password: password || '1234',
      role,
      barcode_id: barcodeId || employeeId,
      department,
      position,
      contact,
      authorization_status: authorized ? 'Authorized' : 'Unauthorized'
    };

    if (editingEmployee) {
      payload.id = editingEmployee.id;
    }

    try {
      await onSaveEmployee(payload);
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving employee');
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (confirm(`Are you sure you want to delete ${emp.name} from the database? This is irreversible.`)) {
      try {
        await onDeleteEmployee(emp.id);
      } catch (err: any) {
        alert(err.message || 'Error deleting employee');
      }
    }
  };

  const handleToggleAuth = async (emp: Employee) => {
    const newStatus = emp.authorization_status === 'Authorized' ? 'Unauthorized' : 'Authorized';
    const payload = {
      ...emp,
      authorization_status: newStatus
    };
    try {
      await onSaveEmployee(payload);
    } catch (err: any) {
      alert('Failed to toggle status');
    }
  };

  // Extract unique departments for filters
  const departments = ['ALL', ...Array.from(new Set(employees.map(e => e.department)))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                          emp.employee_id.toLowerCase().includes(search.toLowerCase()) || 
                          emp.barcode_id.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || emp.department === deptFilter;
    const matchesAuth = authFilter === 'ALL' || 
                        (authFilter === 'AUTH' && emp.authorization_status === 'Authorized') ||
                        (authFilter === 'UNAUTH' && emp.authorization_status === 'Unauthorized');

    return matchesSearch && matchesDept && matchesAuth;
  });

  return (
    <div className="space-y-6" id="employee-view-root">
      
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Employee Directory</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">MANAGE SYSTEM ACCESS RIGHTS AND CARD SCAN IDENTIFICATION</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 uppercase tracking-wide shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search employee, ID or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Dept Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-mono mr-1">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none font-medium text-xs font-mono uppercase"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Auth Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-mono mr-1">Access:</span>
            <select
              value={authFilter}
              onChange={(e) => setAuthFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none font-medium text-xs font-mono uppercase"
            >
              <option value="ALL">ALL ACCESS LEVELS</option>
              <option value="AUTH">✔ AUTHORIZED</option>
              <option value="UNAUTH">⛔ SUSPENDED</option>
            </select>
          </div>
        </div>

      </div>

      {/* Grid of Employees */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredEmployees.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-10 text-center rounded-xl col-span-full text-slate-500 font-mono text-xs">
            No employees found matching the current search parameters.
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div 
              key={emp.id} 
              className={`bg-slate-900 border rounded-xl p-5 relative overflow-hidden transition-all duration-300 ${
                emp.authorization_status === 'Authorized' 
                  ? 'border-slate-800 hover:border-slate-700' 
                  : 'border-rose-950 bg-rose-950/5 hover:border-rose-900'
              }`}
            >
              
              {/* Top Banner Auth status */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-white text-base leading-tight">{emp.name}</h4>
                  <p className="text-xs text-emerald-400 font-mono mt-1">{emp.position}</p>
                </div>

                <button
                  onClick={() => handleToggleAuth(emp)}
                  className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold transition-all ${
                    emp.authorization_status === 'Authorized'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                  }`}
                  title={emp.authorization_status === 'Authorized' ? 'Click to suspend' : 'Click to authorize'}
                >
                  {emp.authorization_status.toUpperCase()}
                </button>
              </div>

              {/* Technical scan identifiers */}
              <div className="space-y-2 pt-3 border-t border-slate-850">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Login Username:</span>
                  <span className="text-emerald-400 font-bold">{emp.username || emp.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Login Password:</span>
                  <span className="text-slate-500 font-mono font-medium">•••••••• (Private)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Portal Role:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                    {emp.role || 'EMPLOYEE'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>ID / Barcode:</span>
                  <span className="text-white font-semibold">{emp.employee_id} ({emp.barcode_id})</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Department:</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] text-slate-300">
                    {emp.department}
                  </span>
                </div>
              </div>

              {/* Footer contact info */}
              <div className="mt-4 pt-3.5 border-t border-slate-850 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {emp.contact || 'No Phone'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(emp.registered_at).toLocaleDateString()}
                </span>
              </div>

              {/* Card Hover Action Bar */}
              <div className="mt-4 flex justify-end gap-1.5">
                <button
                  onClick={() => openEditModal(emp)}
                  className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 hover:text-white rounded text-[10px] font-mono text-slate-400 transition-colors uppercase font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(emp)}
                  className="px-2.5 py-1 bg-slate-850 hover:bg-rose-950 hover:text-rose-400 rounded text-[10px] font-mono text-slate-400 transition-colors uppercase font-medium"
                >
                  Delete
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                {editingEmployee ? '✏ Edit Employee Profile' : '➕ Register New Employee'}
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
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP005"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Barcode Value</label>
                  <input
                    type="text"
                    placeholder="Auto-match ID if empty"
                    value={barcodeId}
                    onChange={(e) => setBarcodeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anjana"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Login Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anjana SE"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Login Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter private password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Portal Access Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="EMPLOYEE">EMPLOYEE (System Engineering / Maintenance / Operations)</option>
                  <option value="STOREKEEPER">STOREKEEPER (Inventory & Conveyor Dispatch)</option>
                  <option value="ADMINISTRATOR">ADMINISTRATOR (Full System Control)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maintenance"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Position / Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tech Lead"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 123-4567"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <input
                  type="checkbox"
                  id="authorized-check"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="w-4.5 h-4.5 text-emerald-500 bg-slate-900 border-slate-800 rounded focus:ring-emerald-500"
                />
                <label htmlFor="authorized-check" className="text-xs text-slate-200 font-medium select-none cursor-pointer">
                  Authorize Warehouse Access & Spare-Parts Requests
                  <span className="block text-[10px] font-mono text-slate-500 mt-0.5 font-normal">
                    If suspended, they cannot request parts or pass barcode checks.
                  </span>
                </label>
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
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
