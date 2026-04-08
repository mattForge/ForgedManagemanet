import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../context/NotificationContext';
import { 
  LifeBuoy, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  User, 
  ChevronRight, 
  X,
  ShieldAlert
} from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  creator_name: string;
  assignee_name: string;
  assigned_to: string | null;
}

interface ITTech {
  id: string;
  full_name: string;
}

export default function ITSupportDashboard({ role }: { role: string }) {
  const { addToast } = useNotifications();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [techs, setTechs] = useState<ITTech[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form state for updates
  const [newStatus, setNewStatus] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [ticketsRes, techsRes] = await Promise.all([
        fetch('/api/tickets', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch('/api/org/it-techs', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      if (!ticketsRes.ok || !techsRes.ok) throw new Error('Failed to fetch data');

      const ticketsData = await ticketsRes.json();
      const techsData = await techsRes.json();

      setTickets(ticketsData.tickets);
      setTechs(techsData.techs);
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setUpdateLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          status: newStatus,
          assigned_to: newAssignee === 'unassigned' ? null : newAssignee
        })
      });

      if (!response.ok) throw new Error('Failed to update ticket');

      addToast('Ticket updated successfully', 'success');
      setSelectedTicket(null);
      fetchData();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const openTicketModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setNewAssignee(ticket.assigned_to || 'unassigned');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600';
      case 'Normal': return 'text-blue-600';
      case 'Low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.creator_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <LifeBuoy className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">IT Support Dashboard</h1>
              <p className="text-gray-500 text-sm">Manage enterprise support requests and technical issues.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search tickets..."
                className="pl-10 pr-4 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg text-sm w-64 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg text-sm py-2 px-4 outline-none transition-all"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Global Ticket Queue</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Creator</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assignee</th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-500 font-medium">Fetching tickets...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                    No tickets found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                    onClick={() => openTicketModal(ticket)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.title}</div>
                      <div className="text-[11px] text-gray-400 mt-1 font-medium">
                        {new Date(ticket.created_at).toLocaleDateString()} • {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold border border-blue-200">
                          {ticket.creator_name.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{ticket.creator_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600 font-medium italic">
                          {ticket.assignee_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-300 group-hover:text-blue-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Manage Ticket</h2>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ticket Title</label>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{selectedTicket.title}</h3>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                  <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap text-sm leading-relaxed shadow-inner">
                    {selectedTicket.description}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</label>
                  <select 
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assign Technician</label>
                  <select 
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                  >
                    <option value="unassigned">Unassigned</option>
                    {techs.map(tech => (
                      <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex justify-end items-center gap-4">
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateTicket}
                disabled={updateLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {updateLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
