import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, CheckSquare, LifeBuoy, Plus, Clock, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, critical: 0 });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('forge_tasks')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setTasks(data);
    }

    // Fetch stats
    const { data: allTasks } = await supabase
      .from('forge_tasks')
      .select('status, priority')
      .eq('assigned_to', user.id);

    if (allTasks) {
      setStats({
        total: allTasks.length,
        completed: allTasks.filter(t => t.status === 'Done').length,
        pending: allTasks.filter(t => t.status !== 'Done').length,
        critical: allTasks.filter(t => t.priority === 'Critical' && t.status !== 'Done').length
      });
    }

    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <LayoutDashboard className="text-blue-600 w-6 h-6" />
          Dashboard Overview
        </h3>
        <p className="text-sm text-gray-400 font-medium">Last updated: {new Date().toLocaleTimeString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Tasks</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-full opacity-20"></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Completed</div>
          <div className="text-3xl font-bold text-emerald-600">{stats.completed}</div>
          <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${(stats.completed / (stats.total || 1)) * 100}%` }}></div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Pending</div>
          <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
          <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${(stats.pending / (stats.total || 1)) * 100}%` }}></div>
          </div>
        </div>
        <div className="bg-white border border-red-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="text-red-500 text-xs font-bold uppercase tracking-wider mb-2">Critical Action</div>
          <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
          <div className="mt-2 h-1 w-full bg-red-50 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${(stats.critical / (stats.total || 1)) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Assignments</h4>
          <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">View All Tasks</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Task Details</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="p-12 text-center text-gray-400 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading task data...
                  </div>
                </td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-gray-400 text-sm">No tasks assigned to your profile.</td></tr>
              ) : tasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-semibold group-hover:text-blue-600 transition-colors">{task.title}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{task.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      task.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                      task.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      task.priority === 'Normal' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      task.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                    {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
