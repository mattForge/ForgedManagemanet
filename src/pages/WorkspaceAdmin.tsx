import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Activity, FileSpreadsheet, LogOut, ShieldAlert, ArrowLeft } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import TeamManager from '../components/workspace-admin/TeamManager';
import ExecutiveDashboard from '../components/workspace-admin/ExecutiveDashboard';
import HRTimesheets from '../components/workspace-admin/HRTimesheets';

export default function WorkspaceAdmin() {
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data } = await supabase
        .from('forge_users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (data) {
        if (data.role === 'HR') {
          navigate('/workspace');
          return;
        }
        setRole(data.role);
        if (data.role === 'Admin') setActiveTab('teams');
        else if (data.role === 'Executive') setActiveTab('metrics');
      }
    };
    fetchRole();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Initializing Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-600 flex font-sans">
      <Sidebar role={role} activeTab={activeTab} setActiveTab={setActiveTab} isAdminView={true} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'teams' && 'Team Management'}
              {activeTab === 'metrics' && 'Performance Metrics'}
              {activeTab === 'timesheets' && 'Timesheet Export'}
            </h2>
            <div className="h-4 w-px bg-gray-200"></div>
            <p className="text-sm text-gray-400 font-medium">Admin Console</p>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8 custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'teams' && <TeamManager />}
            {activeTab === 'metrics' && <ExecutiveDashboard />}
            {activeTab === 'timesheets' && <HRTimesheets />}
          </div>
        </main>
      </div>
    </div>
  );
}
