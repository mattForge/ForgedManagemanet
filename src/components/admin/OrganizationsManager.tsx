import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export default function OrganizationsManager() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setOrgs(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.from('organizations').insert([{ name: newOrgName }]);
    if (error) setError(error.message);
    else {
      setIsAdding(false);
      setNewOrgName('');
      fetchOrgs();
    }
  };

  const handleUpdate = async (id: string) => {
    setError('');
    const { error } = await supabase.from('organizations').update({ name: editName }).eq('id', id);
    if (error) setError(error.message);
    else {
      setEditingId(null);
      fetchOrgs();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This will cascade delete all associated data.')) return;
    setError('');
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchOrgs();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <Building2 className="text-cyan-400 w-5 h-5" />
          Organizations
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 px-4 py-2 rounded flex items-center gap-2 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'New Organization'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-900/50 rounded text-red-400 text-sm font-mono">
          &gt; ERR: {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-inner space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Organization Name</label>
              <input 
                type="text" required value={newOrgName} onChange={e => setNewOrgName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white px-6 py-2 rounded border border-cyan-900 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-2">
              <Save className="w-4 h-4" /> Provision
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
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {loading ? (
              <tr><td colSpan={3} className="p-4 text-center text-zinc-500 text-sm animate-pulse">&gt; Loading matrix data...</td></tr>
            ) : orgs.length === 0 ? (
              <tr><td colSpan={3} className="p-4 text-center text-zinc-500 text-sm">&gt; No organizations found.</td></tr>
            ) : orgs.map(org => (
              <tr key={org.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4 text-xs text-zinc-600 font-mono truncate max-w-[100px]">{org.id}</td>
                <td className="p-4 text-sm text-zinc-200">
                  {editingId === org.id ? (
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded p-1 text-sm w-full shadow-inner" />
                  ) : org.name}
                </td>
                <td className="p-4 text-right space-x-2">
                  {editingId === org.id ? (
                    <>
                      <button onClick={() => handleUpdate(org.id)} className="p-1.5 bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50 rounded border border-cyan-800/50 transition-colors"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(org.id); setEditName(org.name); }} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(org.id)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
