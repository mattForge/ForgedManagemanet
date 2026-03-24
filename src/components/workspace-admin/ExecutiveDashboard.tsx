import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity } from 'lucide-react';

interface Task {
  id: string;
  status: string;
  priority: string;
}

export default function ExecutiveDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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

    const { data } = await supabase
      .from('forge_tasks')
      .select('id, status, priority')
      .eq('organization_id', currentUser.organization_id);
      
    if (data) setTasks(data);
    setLoading(false);
  };

  const statusData = [
    { name: 'To Do', count: tasks.filter(t => t.status === 'To Do').length },
    { name: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length },
    { name: 'Review', count: tasks.filter(t => t.status === 'Review').length },
    { name: 'Done', count: tasks.filter(t => t.status === 'Done').length },
  ];

  const priorityData = [
    { name: 'Low', value: tasks.filter(t => t.priority === 'Low').length },
    { name: 'Normal', value: tasks.filter(t => t.priority === 'Normal').length },
    { name: 'High', value: tasks.filter(t => t.priority === 'High').length },
    { name: 'Critical', value: tasks.filter(t => t.priority === 'Critical').length },
  ];

  const COLORS = ['#3f3f46', '#06b6d4', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <Activity className="text-cyan-400 w-5 h-5" />
          Performance Metrics
        </h3>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm animate-pulse font-mono">&gt; Aggregating telemetry...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-xl">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-6">Task Status Distribution</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-xl">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-6">Task Priority Distribution</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                    itemStyle={{ color: '#22d3ee' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#71717a' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
