import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  MapPin, 
  CheckCircle, 
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction } from '../types.js';

interface TransactionViewProps {
  transactions: Transaction[];
}

export default function TransactionView({ transactions }: TransactionViewProps) {
  const [search, setSearch] = useState('');
  const [binFilter, setBinFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.employee_name.toLowerCase().includes(search.toLowerCase()) || 
                          t.employee_id.toLowerCase().includes(search.toLowerCase()) || 
                          t.replacement_product.toLowerCase().includes(search.toLowerCase()) || 
                          t.defective_product.toLowerCase().includes(search.toLowerCase()) ||
                          t.transaction_id.toLowerCase().includes(search.toLowerCase());
                          
    const matchesBin = binFilter === 'ALL' || t.sorting_bin === binFilter;
    const matchesDate = !dateFilter || t.date === dateFilter;

    return matchesSearch && matchesBin && matchesDate;
  });

  return (
    <div className="space-y-6" id="transaction-view-root">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">System Transaction Audit</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">HISTORICAL TRACKING FOR DEFECT EXCHANGES AND INVENTORY DELIVERIES</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search technician, SKU, product or TX..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Date / Bin Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Sorter bin filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-mono mr-1">Bin:</span>
            <select
              value={binFilter}
              onChange={(e) => setBinFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none font-medium text-xs font-mono"
            >
              <option value="ALL">ALL CHUTES</option>
              <option value="Bin 1">BIN 1 (MECH)</option>
              <option value="Bin 2">BIN 2 (ELEC)</option>
              <option value="Bin 3">BIN 3 (OTHER)</option>
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs text-white font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none text-xs"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="text-[10px] text-slate-500 hover:text-white uppercase font-bold ml-1.5"
              >
                Clear
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Transaction Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/60 font-mono text-slate-500 text-[10px] uppercase border-b border-slate-850">
                <th className="p-4">TX ID</th>
                <th className="p-4">Req Code</th>
                <th className="p-4">Technician Details</th>
                <th className="p-4">Defective Returned</th>
                <th className="p-4">Replacement Issued</th>
                <th className="p-4">Rack & Bin</th>
                <th className="p-4">Auditor / Storekeeper</th>
                <th className="p-4 text-right">Date & Time</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center font-mono text-slate-500">
                    No transactions recorded matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">{t.transaction_id}</td>
                    <td className="p-4 font-mono text-slate-400">{t.request_id}</td>
                    <td className="p-4">
                      <div>
                        <div className="font-semibold text-white">{t.employee_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {t.employee_id}</div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">
                      {t.defective_product}
                    </td>
                    <td className="p-4 text-emerald-400 font-bold">
                      {t.replacement_product}
                    </td>
                    <td className="p-4 font-mono">
                      <div>
                        <span className="text-white">Rack {t.rack_location}</span>
                        <div className="text-[10px] text-indigo-400 font-semibold mt-0.5">{t.sorting_bin}</div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {t.storekeeper_id}
                    </td>
                    <td className="p-4 text-right font-mono text-slate-400">
                      <div>{t.date}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.time}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded font-mono">
                        <CheckCircle className="w-3 h-3" /> AUDITED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
