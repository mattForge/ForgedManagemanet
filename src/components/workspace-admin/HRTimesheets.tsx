import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, FileSpreadsheet } from 'lucide-react';

interface WorkspaceUser {
  id: string;
  full_name: string;
  role: string;
  hourly_rate: number;
  work_status: string;
  teams?: { name: string };
}

export default function HRTimesheets() {
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);

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
    const headers = ['ID', 'Full Name', 'Role', 'Team', 'Hourly Rate', 'Current Status'];
    const rows = users.map(u => [
      u.id,
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <FileSpreadsheet className="text-cyan-400 w-5 h-5" />
          HR Timesheets
        </h3>
        <button 
          onClick={downloadCSV}
          disabled={loading || users.length === 0}
          className="bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white px-4 py-2 rounded border border-cyan-900 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Bulk Download CSV
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-normal">Name</th>
              <th className="p-4 font-normal">Role</th>
              <th className="p-4 font-normal">Team</th>
              <th className="p-4 font-normal">Rate</th>
              <th className="p-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-zinc-500 text-sm animate-pulse">&gt; Loading timesheet records...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-zinc-500 text-sm">&gt; No records found.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
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
    </div>
  );
}
