import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LifeBuoy, ShieldAlert, CheckCircle, Plus, Clock, AlertCircle, ChevronDown, Send } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function UserTickets() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('idle');
        return;
      }

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, description, priority })
      });

      if (res.ok) {
        setStatus('success');
        setTitle('');
        setDescription('');
        setPriority('Normal');
        fetchTickets();
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error("Failed to submit ticket:", err);
      setStatus('idle');
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
            <LifeBuoy className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Help Desk Support</h1>
            <p className="text-gray-500 text-sm">
              Submit an IT support ticket. Our technicians will respond shortly.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Form */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              New Support Request
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={status === 'submitting'}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                placeholder="Brief summary of the problem..."
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={status === 'submitting'}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="Low">Low - Minor issue</option>
                  <option value="Normal">Normal - Standard request</option>
                  <option value="High">High - Significant impact</option>
                  <option value="Critical">Critical - Work stoppage</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Detailed Description
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={status === 'submitting'}
                rows={6}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none disabled:opacity-50"
                placeholder="Please provide as much detail as possible..."
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!title || !description || status === 'submitting'}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2
                  ${status === 'success' 
                    ? 'bg-emerald-600 text-white shadow-emerald-100' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }
                `}
              >
                {status === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Request Submitted
                  </>
                ) : status === 'submitting' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* My Tickets */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">My Requests</h3>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
              {tickets.length} Total
            </span>
          </div>
          
          <div className="flex-1 overflow-auto p-0 custom-scrollbar">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium">Fetching your requests...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LifeBuoy className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-medium">No support requests</h3>
                <p className="text-gray-500 text-sm mt-1">You haven't submitted any tickets yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="px-6 py-5 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {ticket.status === 'Resolved' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> :
                         ticket.status === 'In Progress' ? <Clock className="w-5 h-5 text-blue-500" /> :
                         <AlertCircle className="w-5 h-5 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-4">
                            {ticket.title}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityStyles(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                          <span className="text-gray-300">•</span>
                          <span className={`font-medium ${
                            ticket.status === 'Resolved' ? 'text-emerald-600' : 
                            ticket.status === 'In Progress' ? 'text-blue-600' : 'text-amber-600'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-gray-100">
                          {ticket.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
