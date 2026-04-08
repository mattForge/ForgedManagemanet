import { useState, useEffect, useCallback, Fragment } from 'react';
import { 
  TrendingUp, Users, Clock, CheckCircle, ChevronDown, ChevronRight, 
  RefreshCw, Download, Filter, Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line
} from 'recharts';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

interface OrgStats {
  totalHours: number;
  completedTasks: number;
  resolvedTickets: number;
  activeUsers: number;
  productivityTrend: number;
}

interface TeamStat {
  id: string;
  name: string;
  totalHours: number;
  tasksCompleted: number;
  memberCount: number;
}

interface EmployeeStat {
  id: string;
  name: string;
  team: string;
  teamId: string;
  hours: number;
  tasksDone: number;
  role: string;
}

interface DailyOutput {
  date: string;
  output: number;
}

interface AnalyticsData {
  orgStats: OrgStats;
  teamStats: TeamStat[];
  employeeStats: EmployeeStat[];
  dailyOutput: DailyOutput[];
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/exec/analytics', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Analytics Fetch Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Aggregating Enterprise Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-red-900 font-bold">Analytics Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button 
              onClick={fetchAnalytics}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Analytics</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Performance metrics for the last 30 days
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Last Updated</p>
            <p className="text-xs font-medium text-gray-600">{dayjs(lastUpdated).format('HH:mm A')}</p>
          </div>
          <button 
            onClick={fetchAnalytics}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Top Row: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Org Hours" 
          value={data.orgStats.totalHours.toLocaleString()} 
          icon={Clock} 
          trend={8.2}
          color="blue"
        />
        <KPICard 
          title="Tasks Completed" 
          value={data.orgStats.completedTasks.toLocaleString()} 
          icon={CheckCircle} 
          trend={12.5}
          color="emerald"
        />
        <KPICard 
          title="Resolved Tickets" 
          value={data.orgStats.resolvedTickets.toLocaleString()} 
          icon={TrendingUp} 
          trend={-2.4}
          color="amber"
        />
        <KPICard 
          title="Active Personnel" 
          value={data.orgStats.activeUsers.toLocaleString()} 
          icon={Users} 
          trend={0.5}
          color="slate"
        />
      </div>

      {/* Middle Row: Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Productivity Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-900">Productivity by Team</h3>
            <button className="text-xs font-bold text-blue-600 hover:underline">View Details</button>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.teamStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="totalHours" 
                  fill="#2563eb" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40} 
                  name="Hours Worked"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Organizational Output Line Chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-900">7-Day Organizational Output</h3>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Output</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyOutput}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="output" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Output Units"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Drill-Down Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-gray-900">Team Performance Drill-Down</h3>
            <p className="text-xs text-gray-500 mt-0.5">Click a team to view individual employee metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Filter teams..." 
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personnel</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Hours</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasks Completed</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.teamStats.map((team) => (
                <Fragment key={team.id}>
                  <tr 
                    onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                    className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${expandedTeam === team.id ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {expandedTeam === team.id ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <span className="font-bold text-gray-900">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{team.memberCount} Members</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{team.totalHours}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{team.tasksCompleted} Tasks</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round((team.tasksCompleted / (team.totalHours || 1)) * 100)}%
                      </div>
                    </td>
                  </tr>
                  {expandedTeam === team.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-slate-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                          {data.employeeStats.filter(e => e.teamId === team.id).map(emp => (
                            <div key={emp.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-gray-900">{emp.name}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">{emp.role}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-blue-600">{emp.hours}h</p>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{emp.tasksDone} Done</p>
                              </div>
                            </div>
                          ))}
                          {data.employeeStats.filter(e => e.teamId === team.id).length === 0 && (
                            <p className="text-xs text-gray-400 italic p-4">No employees assigned to this team.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, trend, color }: { 
  title: string, 
  value: string, 
  icon: any, 
  trend: number,
  color: 'blue' | 'emerald' | 'amber' | 'slate'
}) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl border ${colorMap[color]} transition-transform group-hover:scale-110 duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
          <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h2 className="text-3xl font-bold text-gray-900 mt-1">{value}</h2>
      </div>
    </div>
  );
}
