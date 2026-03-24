import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldAlert, Plus, Trash2, X, Save } from 'lucide-react';

interface AdminUser {
  id: string;
  full_name: string;
  organization_id: string | null;
  role: string;
  organizations?: { name: string };
}

interface Organization {
  id: string;
  name: string;
}

export default function AdminsManager() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newOrgId, setNewOrgId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [adminsRes, orgsRes] = await Promise.all([
      supabase.from('forge_users').select('*, organizations(name)').eq('role', 'Admin'),
      supabase.from('organizations').select('id, name')
    ]);
    
    if (adminsRes.error) setError(adminsRes.error.message);
    else setAdmins(adminsRes.data || []);
    
    if (orgsRes.data) setOrgs(orgsRes.data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newName,
          organization_id: newOrgId || null,
          role: 'Admin'
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create admin');
      
      setIsAdding(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewOrgId('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this administrator account?')) return;
    setError('');
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete admin');
      
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <ShieldAlert className="text-cyan-400 w-5 h-5" />
          Administrators
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 px-4 py-2 rounded flex items-center gap-2 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'Provision Admin'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-900/50 rounded text-red-400 text-sm font-mono">
          &gt; ERR: {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-inner space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Full Name</label>
              <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Email Address</label>
              <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Temporary Password</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Assign Organization</label>
              <select required value={newOrgId} onChange={e => setNewOrgId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] appearance-none">
                <option value="">Select Organization...</option>
                {orgs.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white px-6 py-2 rounded border border-cyan-900 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {loading ? 'Processing...' : 'Provision'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-normal">ID</th>
              <th className="p-4 font-normal">Name</th>
              <th className="p-4 font-normal">Organization</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {loading && admins.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-zinc-500 text-sm animate-pulse">&gt; Loading matrix data...</td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-zinc-500 text-sm">&gt; No administrators found.</td></tr>
            ) : admins.map(admin => (
              <tr key={admin.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-xs text-zinc-600 font-mono truncate max-w-[100px]">{admin.id}</td>
                <td className="p-4 text-sm text-zinc-200">{admin.full_name}</td>
                <td className="p-4 text-sm text-zinc-400">{admin.organizations?.name || 'Unassigned'}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(admin.id)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
