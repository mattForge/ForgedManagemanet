import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LifeBuoy, AlertCircle, CheckCircle, Clock, Plus, ShieldAlert, User, ChevronDown, Search, Filter } from 'lucide-react';

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [techs, setTechs] = useState<ITTech[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Form state for standard users
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Normal');

  const isIT = ['IT_Tech', 'Admin', 'Super_User'].includes(role);

  useEffect(() => {
    fetchTickets();
    if (isIT) {
      fetchTechs();
    }
  }, [role]);

  const fetchTickets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/directory/search?q=IT_Tech', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTechs(data.users.filter((u: any) => u.role === 'IT_Tech'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle, description: newDesc, priority: newPriority })
      });
      if (res.ok) {
        setNewTitle('');
        setNewDesc('');
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchTickets();
        if (selectedTicket?.id === id) {
          setSelectedTicket({ ...selectedTicket, ...updates });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'Critical':
      case 'High':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'Low':
        return 'bg-gray-50 text-gray-600 border-gray-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <LifeBuoy className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">IT Support Center</h1>
              <p className="text-gray-500 text-sm">
                {isIT ? 'Manage enterprise support requests and technical issues.' : 'Submit and track your technical support requests.'}
              </p>
            </div>
          </div>
          {!isIT && !selectedTicket && (
            <button
              onClick={() => setSelectedTicket(null)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              New Support Request
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Active Tickets</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search tickets..." 
                    className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 md:w-64"
                  />
                </div>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-medium">Loading ticket database...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-medium">No active tickets</h3>
                  <p className="text-gray-500 text-sm mt-1">All support requests have been resolved.</p>
                </div>
              ) : (
                tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left px-6 py-4 flex items-start gap-4 transition-all hover:bg-gray-50 group ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-100' : ''
                    }`}
                  >
                    <div className="mt-1">
                      {ticket.status === 'Resolved' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> :
                       ticket.status === 'In Progress' ? <Clock className="w-5 h-5 text-blue-500" /> :
                       <AlertCircle className="w-5 h-5 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-4">
                          {ticket.title}
                        </h4>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getPriorityStyles(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                            {ticket.creator_name.charAt(0)}
                          </div>
                          {ticket.creator_name}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                        <span className="text-gray-300">•</span>
                        <span className={`font-medium ${
                          ticket.status === 'Resolved' ? 'text-emerald-600' : 
                          ticket.status === 'In Progress' ? 'text-blue-600' : 'text-amber-600'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Details or Form */}
        <div className="space-y-6">
          {selectedTicket ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden sticky top-6">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Ticket Details</h3>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Close
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityStyles(selectedTicket.priority)}`}>
                      {selectedTicket.priority} Priority
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">#{selectedTicket.id.split('-')[0]}</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">{selectedTicket.title}</h4>
                  <div className="bg-slate-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 leading-relaxed">
                    {selectedTicket.description}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Requested By</p>
                    <p className="text-sm font-medium text-gray-700">{selectedTicket.creator_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Created Date</p>
                    <p className="text-sm font-medium text-gray-700">{new Date(selectedTicket.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {isIT && (
                  <div className="space-y-4 pt-6 border-t border-gray-100">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Update Status
                      </label>
                      <div className="relative">
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                          className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Assign Technician
                      </label>
                      <div className="relative">
                        <select
                          value={selectedTicket.assigned_to || ''}
                          onChange={(e) => handleUpdateTicket(selectedTicket.id, { assigned_to: e.target.value || null })}
                          className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="">-- Unassigned --</option>
                          {techs.map(tech => (
                            <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
                
                {!isIT && (
                  <div className="pt-6 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Current Status</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusStyles(selectedTicket.status)}`}>
                      {selectedTicket.status === 'Resolved' && <CheckCircle className="w-4 h-4" />}
                      {selectedTicket.status === 'In Progress' && <Clock className="w-4 h-4" />}
                      {selectedTicket.status === 'Pending' && <AlertCircle className="w-4 h-4" />}
                      {selectedTicket.status}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  New Support Request
                </h3>
              </div>
              <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Brief summary of the issue"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Priority Level</label>
                  <div className="relative">
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={4}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    placeholder="Please provide as much detail as possible..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newTitle || !newDesc}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  Submit Request
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
