import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckSquare, Plus, X, Save, Clock, GripVertical } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  organization_id: string;
}

interface User {
  id: string;
  full_name: string;
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newAssignee, setNewAssignee] = useState('');

  const COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'];

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

    const [tasksRes, usersRes] = await Promise.all([
      supabase.from('forge_tasks').select('*').eq('organization_id', currentUser.organization_id),
      supabase.from('forge_users').select('id, full_name').eq('organization_id', currentUser.organization_id)
    ]);
    
    if (tasksRes.error) setError(tasksRes.error.message);
    else setTasks(tasksRes.data || []);
    
    if (usersRes.error) setError(usersRes.error.message);
    else setUsers(usersRes.data || []);
    
    setLoading(false);
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentUser } = await supabase.from('forge_users').select('organization_id').eq('id', user?.id).single();
      
      const { error } = await supabase.from('forge_tasks').insert({
        title: newTitle,
        description: newDesc,
        status: 'To Do',
        priority: newPriority,
        assigned_to: newAssignee || null,
        organization_id: currentUser?.organization_id,
        created_by: user?.id
      });
      
      if (error) throw error;
      
      setIsAdding(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('Normal');
      setNewAssignee('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    const { error } = await supabase
      .from('forge_tasks')
      .update({ status: newStatus })
      .eq('id', taskId);
      
    if (error) {
      setError(error.message);
      fetchData(); // Revert on error
    }
  };

  const getAssigneeName = (id: string | null) => {
    if (!id) return 'Unassigned';
    return users.find(u => u.id === id)?.full_name || 'Unknown';
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center shrink-0">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <CheckSquare className="text-blue-600 w-6 h-6" />
          Task Board
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold transition-all shadow-sm border ${
            isAdding 
              ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50' 
              : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
          }`}
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm font-medium flex items-center gap-3 shrink-0">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          Error: {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleCreateTask} className="bg-white border border-gray-200 p-6 rounded-xl shadow-md space-y-6 shrink-0 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Task Title</label>
              <input 
                type="text" 
                required 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                placeholder="Enter task name..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
              <textarea 
                required 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)} 
                rows={3} 
                placeholder="Describe the objective..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Priority Level</label>
              <select 
                required 
                value={newPriority} 
                onChange={e => setNewPriority(e.target.value)} 
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assign To</label>
              <select 
                value={newAssignee} 
                onChange={e => setNewAssignee(e.target.value)} 
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {loading ? 'Processing...' : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden min-h-[500px]">
        {COLUMNS.map(column => (
          <div key={column} className="bg-gray-100/50 border border-gray-200 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center shrink-0">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">{column}</h4>
              <span className="bg-white text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold border border-gray-200 shadow-sm">
                {tasks.filter(t => t.status === column).length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {tasks.filter(t => t.status === column).map(task => (
                <div key={task.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm group hover:shadow-md hover:border-blue-200 transition-all cursor-default">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      task.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                      task.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      task.priority === 'Normal' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {task.priority}
                    </span>
                    <select 
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                      className="bg-transparent text-gray-400 text-[10px] font-bold uppercase tracking-wider hover:text-blue-600 focus:outline-none cursor-pointer appearance-none text-right transition-colors"
                    >
                      {COLUMNS.map(c => <option key={c} value={c} className="bg-white text-gray-900">{c}</option>)}
                    </select>
                  </div>
                  <h5 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{task.title}</h5>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] text-blue-600 font-bold border border-blue-100">
                        {getAssigneeName(task.assigned_to).charAt(0)}
                      </div>
                      <span className="text-[10px] font-semibold text-gray-500 truncate max-w-[100px]">{getAssigneeName(task.assigned_to)}</span>
                    </div>
                    <Clock className="w-3 h-3 text-gray-300" />
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === column).length === 0 && (
                <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 text-xs italic">
                  No tasks in {column}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
