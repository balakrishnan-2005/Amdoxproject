import React, { useEffect, useState } from 'react';
import { X, Loader2, Calendar, User, Flag, Type, AlignLeft } from 'lucide-react';
import api from '../api';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProjectId?: number;
}

export default function TaskModal({ isOpen, onClose, onSuccess, initialProjectId }: TaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
    project_id: initialProjectId || '',
    assignee_id: '',
    due_date: ''
  });

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [projectsRes, usersRes] = await Promise.all([
            api.get('/projects'),
            api.get('/users')
          ]);
          setProjects(projectsRes.data);
          setUsers(usersRes.data);
          if (initialProjectId) {
            setFormData(prev => ({ ...prev, project_id: initialProjectId }));
          } else if (projectsRes.data.length > 0 && !formData.project_id) {
            setFormData(prev => ({ ...prev, project_id: projectsRes.data[0].id }));
          }
        } catch (err) {
          console.error('Failed to fetch modal data', err);
        }
      };
      fetchData();
    }
  }, [isOpen, initialProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/tasks', {
        ...formData,
        project_id: Number(formData.project_id),
        assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null,
        due_date: formData.due_date || null
      });
      onSuccess();
      onClose();
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'To Do',
        project_id: initialProjectId || '',
        assignee_id: '',
        due_date: ''
      });
    } catch (err) {
      console.error('Failed to create task', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Create New Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Project Selection (if not fixed) */}
          {!initialProjectId && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center">
                <Flag size={16} className="mr-2 text-slate-400" /> Project
              </label>
              <select
                required
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              >
                <option value="" disabled>Select a project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center">
              <Type size={16} className="mr-2 text-slate-400" /> Task Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              placeholder="What needs to be done?"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center">
              <AlignLeft size={16} className="mr-2 text-slate-400" /> Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all resize-none"
              placeholder="Add more details about this task..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Initial Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Assignee */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center">
                <User size={16} className="mr-2 text-slate-400" /> Assignee
              </label>
              <select
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center">
                <Calendar size={16} className="mr-2 text-slate-400" /> Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all"
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.title || (!initialProjectId && !formData.project_id)}
            className="flex-1 px-4 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-accent/20"
          >
            {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
