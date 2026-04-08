import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, FileSpreadsheet, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';

interface WorkspaceUser {
  id: string;
  full_name: string;
  role: string;
  hourly_rate: number;
  work_status: string;
  employee_code?: string;
  teams?: { name: string };
}

export default function HRTimesheets() {
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const { addToast } = useNotifications();

  // Pay period month/year selection
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = [2024, 2025, 2026];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentUser } = await supabase
      .from('forge_users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!currentUser?.organization_id) return;

    const { data } = await supabase
      .from('forge_users')
      .select('*, teams(name)')
      .eq('organization_id', currentUser.organization_id);
      
    if (data) setUsers(data);
    setLoading(false);
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Employee Code', 'Full Name', 'Role', 'Team', 'Hourly Rate', 'Current Status'];
    const rows = users.map(u => [
      u.id,
      u.employee_code || '-',
      `"${u.full_name}"`,
      u.role,
      `"${u.teams?.name || 'Unassigned'}"`,
      u.hourly_rate,
      u.work_status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSageSync = async () => {
    setSyncing(true);
    setShowSyncModal(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/hr/sync-sage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sage synchronization failed');
      }

      addToast(result.message || 'Payroll successfully synced to Sage', 'success');
    } catch (err: any) {
      console.error('Sage Sync Error:', err);
      addToast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <FileSpreadsheet className="text-cyan-400 w-5 h-5" />
            HR Timesheets
          </h3>
          
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded p-1">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-zinc-300 text-xs font-mono focus:outline-none p-1"
            >
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-zinc-300 text-xs font-mono focus:outline-none p-1"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={downloadCSV}
            disabled={loading || users.length === 0}
            className="bg-gradient-to-b from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white px-4 py-2 rounded border border-zinc-600 uppercase text-[10px] font-bold tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          
          <button 
            onClick={() => setShowSyncModal(true)}
            disabled={loading || users.length === 0 || syncing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded border border-emerald-700 uppercase text-[10px] font-bold tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {syncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Sync to Sage Payroll
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-normal">Employee ID</th>
              <th className="p-4 font-normal">Name</th>
              <th className="p-4 font-normal">Role</th>
              <th className="p-4 font-normal">Team</th>
              <th className="p-4 font-normal">Rate</th>
              <th className="p-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center text-zinc-500 text-sm animate-pulse">&gt; Loading timesheet records...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-zinc-500 text-sm">&gt; No records found.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-xs font-mono text-zinc-500">{u.employee_code || u.id.slice(0, 8)}</td>
                <td className="p-4 text-sm text-zinc-200">{u.full_name}</td>
                <td className="p-4 text-xs text-cyan-400 font-mono">{u.role}</td>
                <td className="p-4 text-sm text-zinc-400">{u.teams?.name || '-'}</td>
                <td className="p-4 text-sm text-zinc-400">${u.hourly_rate}/hr</td>
                <td className="p-4 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    u.work_status === 'Online' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' :
                    'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {u.work_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sage Sync Confirmation Modal */}
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSyncModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-emerald-900/20 p-6 border-b border-emerald-900/30 flex items-center gap-4">
                <div className="p-3 bg-emerald-950 rounded-full border border-emerald-500/30">
                  <AlertCircle className="text-emerald-400 w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-zinc-100 uppercase tracking-wider">Sage Payroll Sync</h4>
                  <p className="text-xs text-emerald-400 font-mono">Enterprise Integration Bridge</p>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  You are about to sync <span className="text-emerald-400 font-bold">{months[selectedMonth - 1]} {selectedYear}</span> payroll data to Sage. 
                  This will aggregate decimal hours for all personnel based on the 20th-to-20th pay period logic.
                </p>
                
                <div className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <span>Target Period</span>
                    <span className="text-zinc-300">{months[selectedMonth - 1]} {selectedYear}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <span>Personnel Count</span>
                    <span className="text-zinc-300">{users.length} Records</span>
                  </div>
                </div>

                <p className="text-xs text-red-400 font-medium italic">
                  * This action cannot be undone. Please verify all timesheets are complete before proceeding.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex gap-3">
                <button 
                  onClick={() => setShowSyncModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSageSync}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-emerald-900/20"
                >
                  Confirm & Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
