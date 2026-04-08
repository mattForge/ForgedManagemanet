import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Download, 
  FileSpreadsheet, 
  Archive, 
  Calendar, 
  Users, 
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';

interface ForgeUser {
  id: string;
  full_name: string;
  role: string;
  work_status: string;
  organization_id: string;
}

export default function HRDashboard() {
  const { addToast } = useNotifications();
  const [users, setUsers] = useState<ForgeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    let channel: any;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('forge_users')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userData?.organization_id) return;

        // Initial fetch
        const { data: orgUsers, error } = await supabase
          .from('forge_users')
          .select('*')
          .eq('organization_id', userData.organization_id)
          .order('full_name');

        if (error) throw error;
        setUsers(orgUsers || []);

        // Realtime subscription for status updates
        channel = supabase
          .channel('hr-status-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'forge_users',
              filter: `organization_id=eq.${userData.organization_id}`
            },
            (payload) => {
              const updatedUser = payload.new as ForgeUser;
              setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, work_status: updatedUser.work_status } : u));
            }
          )
          .subscribe();
      } catch (error) {
        console.error('Error initializing HR Dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleDownload = async (userId: string, userName: string) => {
    setExporting(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`/api/hr/timesheets/${userId}?month=${selectedMonth}&year=${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to download timesheet (Status: ${response.status})`;
        addToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Timesheet_${userName.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading timesheet:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleBulkDownload = async () => {
    setExporting('bulk');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`/api/hr/timesheets/bulk?month=${selectedMonth}&year=${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to download bulk timesheets (Status: ${response.status})`;
        addToast(errorMessage, 'error');
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Timesheets_Bulk_${selectedMonth}_${selectedYear}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading bulk timesheets:', error);
    } finally {
      setExporting(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = [2024, 2025, 2026];

  return (
    <div className="bg-transparent">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">HR Timesheet Export</h1>
            <p className="text-slate-500 mt-1">Manage and export employee attendance records</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 px-3 py-1.5 cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <div className="w-px bg-slate-200 my-1 mx-1" />
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 px-3 py-1.5 cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleBulkDownload}
              disabled={exporting === 'bulk'}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'bulk' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              Export All (ZIP)
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Employees</p>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Current Period</p>
                <p className="text-2xl font-bold text-slate-900">
                  {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Export Format</p>
                <p className="text-2xl font-bold text-slate-900">CSV / ZIP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-bottom border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search employees or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="w-4 h-4" />
              <span>Showing {filteredUsers.length} employees</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-8 bg-slate-100 rounded w-8 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      No employees found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                            {user.full_name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.role}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                          user.work_status === 'Online' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${user.work_status === 'Online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {user.work_status === 'Online' ? 'Clocked In' : 'Clocked Out'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownload(user.id, user.full_name)}
                          disabled={exporting === user.id}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                          title="Download Timesheet"
                        >
                          {exporting === user.id ? (
                            <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
