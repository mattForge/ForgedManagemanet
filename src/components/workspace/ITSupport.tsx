import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LifeBuoy, Plus, Trash2, X, Save, AlertCircle } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  creator?: { full_name: string };
  assignee?: { full_name: string };
}

export default function ITSupport({ role }: { role: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Normal');

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

    let query = supabase
      .from('forge_tickets')
      .select('*, creator:forge_users!forge_tickets_created_by_fkey(full_name), assignee:forge_users!forge_tickets_assigned_to_fkey(full_name)')
      .eq('organization_id', currentUser.organization_id)
      .order('created_at', { ascending: false });

    // If not IT Tech, only show their own tickets
    if (role !== 'IT_Tech') {
      query = query.eq('created_by', user.id);
    }

    const { data, error } = await query;
    
    if (error) setError(error.message);
    else setTickets(data || []);
    
    setLoading(false);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentUser } = await supabase.from('forge_users').select('organization_id').eq('id', user?.id).single();
      
      const { error } = await supabase.from('forge_tickets').insert({
        title: newTitle,
        description: newDesc,
        status: 'Open',
        priority: newPriority,
        organization_id: currentUser?.organization_id,
        created_by: user?.id
      });
      
      if (error) throw error;
      
      setIsAdding(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('Normal');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from('forge_tickets').update({ status: newStatus }).eq('id', ticketId);
    if (error) {
      setError(error.message);
      fetchData();
    }
  };

  const claimTicket = async (ticketId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setTickets(tickets.map(t => t.id === ticketId ? { ...t, assigned_to: user.id, status: 'In Progress' } : t));
    const { error } = await supabase.from('forge_tickets').update({ assigned_to: user.id, status: 'In Progress' }).eq('id', ticketId);
    if (error) {
      setError(error.message);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <LifeBuoy className="text-cyan-400 w-5 h-5" />
          IT Support Tickets
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 px-4 py-2 rounded flex items-center gap-2 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-900/50 rounded text-red-400 text-sm font-mono">
          &gt; ERR: {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleCreateTicket} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-inner space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Issue Summary</label>
              <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Detailed Description</label>
              <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] resize-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Severity</label>
              <select required value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 text-sm focus:outline-none focus:border-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] appearance-none">
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white px-6 py-2 rounded border border-cyan-900 uppercase text-xs font-bold tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {loading ? 'Processing...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-normal">Ticket</th>
              <th className="p-4 font-normal">Severity</th>
              <th className="p-4 font-normal">Status</th>
              <th className="p-4 font-normal">Reporter</th>
              <th className="p-4 font-normal">Assignee</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {loading && tickets.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-zinc-500 text-sm animate-pulse">&gt; Loading ticket queue...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-zinc-500 text-sm">&gt; No tickets found.</td></tr>
            ) : tickets.map(ticket => (
              <tr key={ticket.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-4">
                  <div className="text-sm text-zinc-200 font-bold">{ticket.title}</div>
                  <div className="text-xs text-zinc-500 truncate max-w-xs">{ticket.description}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    ticket.priority === 'Critical' ? 'bg-red-950/50 text-red-400 border border-red-900/50' :
                    ticket.priority === 'High' ? 'bg-orange-950/50 text-orange-400 border border-orange-900/50' :
                    ticket.priority === 'Normal' ? 'bg-yellow-950/50 text-yellow-400 border border-yellow-900/50' :
                    'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="p-4">
                  {role === 'IT_Tech' ? (
                    <select 
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider appearance-none focus:outline-none cursor-pointer ${
                        ticket.status === 'Resolved' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' :
                        ticket.status === 'In Progress' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50' :
                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      <option value="Open" className="bg-zinc-900">Open</option>
                      <option value="In Progress" className="bg-zinc-900">In Progress</option>
                      <option value="Resolved" className="bg-zinc-900">Resolved</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      ticket.status === 'Resolved' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' :
                      ticket.status === 'In Progress' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50' :
                      'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {ticket.status}
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm text-zinc-400">{ticket.creator?.full_name || 'Unknown'}</td>
                <td className="p-4 text-sm text-zinc-400">{ticket.assignee?.full_name || 'Unassigned'}</td>
                <td className="p-4 text-right">
                  {role === 'IT_Tech' && !ticket.assigned_to && (
                    <button onClick={() => claimTicket(ticket.id)} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 rounded uppercase text-[10px] font-bold tracking-wider active:scale-95 transition-all shadow-md">
                      Claim
                    </button>
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
