import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Users, 
  Calendar,
  Folder,
  Loader2,
  PlusCircle
} from 'lucide-react';
import api from '../api';
import TaskModal from '../components/TaskModal';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects', newProject);
      setShowModal(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const openAddTask = (projectId: number) => {
    setSelectedProjectId(projectId);
    setShowTaskModal(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500">Manage and organize your team's work</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => { setSelectedProjectId(undefined); setShowTaskModal(true); }}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl font-medium flex items-center hover:bg-slate-50 transition-all"
          >
            <PlusCircle size={20} className="mr-2 text-accent" />
            Quick Task
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-accent text-white px-4 py-2 rounded-xl font-medium flex items-center hover:bg-accent/90 transition-all"
          >
            <Plus size={20} className="mr-2" />
            Create Project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <Folder size={24} />
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => openAddTask(project.id)}
                    className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                    title="Add task to project"
                  >
                    <Plus size={18} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{project.name}</h3>
              <p className="text-slate-500 text-sm mb-6 line-clamp-2">{project.description}</p>
              
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center text-slate-500 text-xs">
                  <Calendar size={14} className="mr-1" />
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white"></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Folder className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 font-medium">No projects yet. Create your first one!</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                  placeholder="e.g. Marketing Campaign"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                  placeholder="What is this project about?"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TaskModal 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        onSuccess={() => {}} 
        initialProjectId={selectedProjectId}
      />
    </div>
  );
}
