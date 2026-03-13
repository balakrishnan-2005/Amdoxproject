import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuthStore } from '../store';
import TaskModal from '../components/TaskModal';

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className="flex items-center text-emerald-600 text-sm font-medium">
          <TrendingUp size={16} className="mr-1" />
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, tasksRes] = await Promise.all([
          api.get('/reports/stats'),
          api.get('/tasks?limit=5')
        ]);
        setStats(statsRes.data);
        setRecentTasks(tasksRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const totalTasks = stats?.statusStats.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0;
  const completedTasks = stats?.statusStats.find((s: any) => s.status === 'Done')?.count || 0;
  const pendingTasks = totalTasks - completedTasks;
  const criticalTasks = stats?.priorityStats.find((p: any) => p.priority === 'Critical')?.count || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Overview of your team's performance</p>
        </div>
        <button 
          onClick={() => setShowTaskModal(true)}
          className="bg-accent text-white px-4 py-2 rounded-xl font-medium flex items-center hover:bg-accent/90 transition-all"
        >
          <Plus size={20} className="mr-2" />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Tasks" 
          value={totalTasks} 
          icon={TrendingUp} 
          color="bg-primary" 
          trend="+12%"
        />
        <StatCard 
          title="Completed" 
          value={completedTasks} 
          icon={CheckCircle2} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Pending" 
          value={pendingTasks} 
          icon={Clock} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Critical" 
          value={criticalTasks} 
          icon={AlertCircle} 
          color="bg-critical" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Tasks</h3>
            <Link to="/tasks" className="text-accent text-sm font-medium hover:underline flex items-center">
              View all <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTasks.length > 0 ? recentTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-10 rounded-full ${
                    task.priority === 'Critical' ? 'bg-critical' : 
                    task.priority === 'High' ? 'bg-orange-500' : 
                    'bg-slate-300'
                  }`}></div>
                  <div>
                    <h4 className="font-medium text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-500">Assigned to: {task.assignee_name || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    task.status === 'Done' ? 'bg-emerald-100 text-emerald-700' :
                    task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-500">No tasks found</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-6">Team Activity</h3>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-4">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-slate-900">
                    <span className="font-bold">Sarah Chen</span> updated the status of <span className="text-accent font-medium">API Integration</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TaskModal 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        onSuccess={() => {
          // Refresh data after task creation
          api.get('/reports/stats').then(res => setStats(res.data));
          api.get('/tasks?limit=5').then(res => setRecentTasks(res.data.slice(0, 5)));
        }} 
      />
    </div>
  );
}
