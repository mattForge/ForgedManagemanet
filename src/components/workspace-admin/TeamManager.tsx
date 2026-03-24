import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Plus, Trash2, X, Save } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface WorkspaceUser {
  id: string;
  full_name: string;
  role: string;
  team_id: string | null;
  hourly_rate: number;
  teams?: { name: string };
}

export default function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('User');
  const [newTeamId, setNewTeamId] = useState('');
  const [newHourlyRate, setNewHourlyRate] = useState('0');

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

    const [teamsRes, usersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('organization_id', currentUser.organization_id),
      supabase.from('forge_users').select('*, teams(name)').eq('organization_id', currentUser.organization_id).not('role', 'in', '("Super_User", "Admin")')
    ]);
    
    if (teamsRes.error) setError(teamsRes.error.message);
    else setTeams(teamsRes.data || []);
    
    if (usersRes.error) setError(usersRes.error.message);
    else setUsers(usersRes.data || []);
    
    setLoading(false);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentUser } = await supabase.from('forge_users').select('organization_id').eq('id', user?.id).single();
      
      const { error } = await supabase.from('teams').insert({
        name: newTeamName,
        organization_id: currentUser?.organization_id
      });
      
      if (error) throw error;
      
      setIsAddingTeam(false);
      setNewTeamName('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    setLoading(true);
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) setError(error.message);
    fetchData();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/workspace/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newName,
          role: newRole,
          team_id: newTeamId || null,
          hourly_rate: parseFloat(newHourlyRate) || 0
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to provision user');
      
      setIsAddingUser(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('User');
      setNewTeamId('');
      setNewHourlyRate('0');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this user?')) return;
    setError('');
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workspace/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to terminate user');
      
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-3 bg-red-950/50 border border-red-900/50 rounded text-red-400 text-sm font-mono">
          &gt; ERR: {error}
        </div>
      )}

      {/* Teams Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <Users className="text-cyan-400 w-5 h-5" />
            Teams
          </h3>
          <button 
            onClick={() => setIsAddingTeam(!isAddingTeam)}
            className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 px-4 py-2 rounded flex items-center gap-2 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md"
          >
            {isAddingTeam ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingTeam ? 'Cancel' : 'New Team'}
          </button>
        </div>

        {isAddingTeam && (
          <form onSubmit={handleCreateTeam} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg shadow-inner flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Team Name</label>
              <input type="text" required value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
            </div>
            <button type="submit" disabled={loading} className="bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white px-6 py-2.5 rounded border border-cyan-900 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> Create
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex justify-between items-center shadow-md">
              <span className="text-zinc-200 font-bold">{team.name}</span>
              <button onClick={() => handleDeleteTeam(team.id)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Users Section */}
      <div className="space-y-4 pt-8 border-t border-zinc-800">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <Users className="text-cyan-400 w-5 h-5" />
            Workspace Users
          </h3>
          <button 
            onClick={() => setIsAddingUser(!isAddingUser)}
            className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 px-4 py-2 rounded flex items-center gap-2 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md"
          >
            {isAddingUser ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingUser ? 'Cancel' : 'Provision User'}
          </button>
        </div>

        {isAddingUser && (
          <form onSubmit={handleCreateUser} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-inner space-y-4">
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
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Role</label>
                <select required value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] appearance-none">
                  <option value="User">User</option>
                  <option value="Executive">Executive</option>
                  <option value="HR">HR</option>
                  <option value="IT_Tech">IT Tech</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Assign Team</label>
                <select value={newTeamId} onChange={e => setNewTeamId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] appearance-none">
                  <option value="">No Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Hourly Rate ($)</label>
                <input type="number" step="0.01" required value={newHourlyRate} onChange={e => setNewHourlyRate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
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
                <th className="p-4 font-normal">Name</th>
                <th className="p-4 font-normal">Role</th>
                <th className="p-4 font-normal">Team</th>
                <th className="p-4 font-normal">Rate</th>
                <th className="p-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading && users.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-zinc-500 text-sm animate-pulse">&gt; Loading matrix data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-zinc-500 text-sm">&gt; No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 text-sm text-zinc-200">{u.full_name}</td>
                  <td className="p-4 text-xs text-cyan-400 font-mono">{u.role}</td>
                  <td className="p-4 text-sm text-zinc-400">{u.teams?.name || '-'}</td>
                  <td className="p-4 text-sm text-zinc-400">${u.hourly_rate}/hr</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
