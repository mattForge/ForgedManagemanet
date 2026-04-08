import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, CheckSquare, LifeBuoy, LogOut, ShieldAlert, Clock, Power, MessageSquare, Settings } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import PageLoader from '../components/ui/PageLoader';
import Dashboard from '../components/workspace/Dashboard';
import TaskBoard from '../components/workspace/TaskBoard';
import ITSupportDashboard from '../components/workspace/ITSupportDashboard';
import ITAssetManager from '../components/workspace/ITAssetManager';
import UserTickets from '../components/workspace/UserTickets';
import DirectMessageHub from '../components/workspace/DirectMessageHub';
import HRDashboard from './hr/HRDashboard';
import UserSettings from './UserSettings';
import ExecutiveDashboard from './ExecutiveDashboard';

export default function Workspace() {
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [workStatus, setWorkStatus] = useState<string>('Offline');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data } = await supabase
        .from('forge_users')
        .select('role, full_name, work_status')
        .eq('id', user.id)
        .single();

      if (data) {
        setRole(data.role);
        setFullName(data.full_name);
        setWorkStatus(data.work_status || 'Offline');
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const toggleWorkStatus = async () => {
    const newStatus = workStatus === 'Online' ? 'Offline' : 'Online';
    setWorkStatus(newStatus);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('forge_users').update({ work_status: newStatus }).eq('id', user.id);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Initializing Workspace...</p>
        </div>
      </div>
    );
  }

  const isAdminRole = ['Super_User', 'Admin', 'HR', 'Executive'].includes(role);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-600 flex font-sans">
      <Sidebar role={role} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'tasks' && 'Task Board'}
              {activeTab === 'help-desk' && 'Help Desk'}
              {activeTab === 'assets' && 'Asset Inventory'}
              {activeTab === 'messages' && 'Messages'}
              {activeTab === 'timesheets' && 'HR Admin'}
              {activeTab === 'settings' && 'Account Settings'}
              {activeTab === 'analytics' && 'Executive Analytics'}
            </h2>
            <div className="h-4 w-px bg-gray-200"></div>
            <p className="text-sm text-gray-400 font-medium">Enterprise Suite</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 leading-none">{fullName}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-1">{role.replace('_', ' ')}</p>
              </div>
              <button 
                onClick={toggleWorkStatus}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-sm ${
                  workStatus === 'Online' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${workStatus === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                {workStatus}
              </button>
              <div className="h-8 w-px bg-gray-100 mx-1"></div>
              <button
                onClick={() => setActiveTab('settings')}
                className={`p-2 rounded-lg transition-all ${
                  activeTab === 'settings' 
                    ? 'bg-blue-50 text-blue-600 shadow-inner' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
                title="Account Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8 custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'tasks' && <TaskBoard />}
            {activeTab === 'help-desk' && (
              ['IT_Tech', 'Admin', 'Super_User'].includes(role) 
                ? <ITSupportDashboard role={role} /> 
                : <UserTickets />
            )}
            {activeTab === 'assets' && <ITAssetManager />}
            {activeTab === 'messages' && <DirectMessageHub />}
            {activeTab === 'timesheets' && <HRDashboard />}
            {activeTab === 'settings' && <UserSettings />}
            {activeTab === 'analytics' && <ExecutiveDashboard />}
          </div>
        </main>
      </div>
    </div>
  );
}
