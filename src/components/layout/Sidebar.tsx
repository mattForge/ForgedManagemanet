import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, LifeBuoy, LogOut, ShieldAlert, MessageSquare, ArrowLeft, Users, Activity, FileSpreadsheet, Package, Settings } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  role: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isAdminView?: boolean;
}

export default function Sidebar({ role, activeTab, setActiveTab, isAdminView }: SidebarProps) {
  const navigate = useNavigate();
  const { unreadDMs, unreadTickets, clearUnreadDMs, clearUnreadTickets } = useNotifications();

  const handleTabClick = (tabId: string) => {
    if (setActiveTab) {
      setActiveTab(tabId);
      if (tabId === 'messages') clearUnreadDMs();
      if (tabId === 'help-desk') clearUnreadTickets();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isAdminRole = ['Super_User', 'Admin', 'Executive'].includes(role);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'help-desk', label: 'Help Desk', icon: LifeBuoy, badge: unreadTickets > 0 && ['IT_Tech', 'Admin', 'Super_User'].includes(role) ? unreadTickets : null },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadDMs > 0 ? unreadDMs : null },
  ];

  if (['IT_Tech', 'Admin', 'Executive'].includes(role)) {
    navItems.push({ id: 'assets', label: 'Asset Inventory', icon: Package });
  }

  if (['HR', 'Super_User'].includes(role)) {
    navItems.push({ id: 'timesheets', label: 'HR Admin', icon: FileSpreadsheet });
  }

  navItems.push({ id: 'settings', label: 'Settings', icon: Settings });

  const adminNavItems = [
    { id: 'teams', label: 'Team Management', icon: Users, roles: ['Admin'] },
    { id: 'metrics', label: 'Performance Metrics', icon: Activity, roles: ['Executive'] },
    { id: 'timesheets', label: 'Timesheet Export', icon: FileSpreadsheet, roles: ['Super_User'] },
  ];

  const currentNavItems = isAdminView 
    ? adminNavItems.filter(item => item.roles.includes(role))
    : navItems;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center shadow-sm">
            <ShieldAlert className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {isAdminView ? 'Admin Console' : 'Workspace'}
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Enterprise Suite</p>
          </div>
        </div>
        <div className="mt-4 px-2 py-1 bg-slate-50 rounded border border-gray-100 inline-block">
          <span className="text-[10px] text-gray-500 font-medium">Role: {role.replace('_', ' ')}</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {currentNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === item.id 
                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`} /> 
              {item.label}
            </div>
            {'badge' in item && item.badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                item.id === 'messages' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-2 bg-slate-50/50">
        {isAdminRole && !isAdminView && (
          <button 
            onClick={() => navigate(role === 'Super_User' ? '/platform-admin' : '/workspace-admin')} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-md text-xs font-semibold shadow-sm transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" /> Admin Panel
          </button>
        )}
        {isAdminView && (
          <button 
            onClick={() => navigate('/workspace')} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-md text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gray-400" /> Back to Workspace
          </button>
        )}
        <button 
          onClick={handleLogout} 
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-100 rounded-md text-xs font-semibold shadow-sm transition-all"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );
}
