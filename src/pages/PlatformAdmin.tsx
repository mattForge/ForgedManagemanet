import React, { useState } from 'react';
import { Building2, ShieldAlert, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OrganizationsManager from '../components/admin/OrganizationsManager';
import AdminsManager from '../components/admin/AdminsManager';

export default function PlatformAdmin() {
  const [activeTab, setActiveTab] = useState<'orgs' | 'admins'>('orgs');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-mono flex">
      {/* Sidebar - Carbon Fiber */}
      <div className="w-64 border-r border-zinc-800 flex flex-col relative" style={{ backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        <div className="absolute inset-0 bg-zinc-950/80 pointer-events-none"></div>
        <div className="p-6 border-b border-zinc-800 relative z-10 bg-gradient-to-b from-zinc-800 to-zinc-950">
          <h1 className="text-xl font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="text-cyan-400 w-6 h-6" />
            Forge<br/>Admin
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 relative z-10">
          <button
            onClick={() => setActiveTab('orgs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded uppercase tracking-wider text-sm transition-all ${activeTab === 'orgs' ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-inner' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
          >
            <Building2 className="w-4 h-4" /> Organizations
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded uppercase tracking-wider text-sm transition-all ${activeTab === 'admins' ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-inner' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
          >
            <ShieldAlert className="w-4 h-4" /> Administrators
          </button>
        </nav>
        <div className="p-4 border-t border-zinc-800 relative z-10">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-red-400 border border-zinc-800 rounded uppercase tracking-wider text-xs active:scale-95 transition-all">
            <LogOut className="w-4 h-4" /> Terminate Session
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-zinc-800 flex items-center px-8 bg-gradient-to-r from-zinc-900 to-zinc-950">
          <h2 className="text-lg text-zinc-100 uppercase tracking-widest">
            {activeTab === 'orgs' ? '> Organization Matrix' : '> Administrator Provisioning'}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-8">
          {activeTab === 'orgs' ? <OrganizationsManager /> : <AdminsManager />}
        </main>
      </div>
    </div>
  );
}
