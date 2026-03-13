import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  MessageSquare, 
  Paperclip,
  Loader2
} from 'lucide-react';
import api from '../api';
import { io } from 'socket.io-client';
import TaskModal from '../components/TaskModal';

const COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'];

const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors: any = {
    Critical: 'bg-critical text-white',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-blue-100 text-blue-700',
    Low: 'bg-slate-100 text-slate-700'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[priority]}`}>
      {priority}
    </span>
  );
};

export default function Kanban() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const socket = io();
    socket.on('task_updated', (updatedTask) => {
      setTasks(prev => prev.map(t => t.id === Number(updatedTask.id) ? { ...t, ...updatedTask } : t));
    });
    return () => { socket.disconnect(); };
  }, []);

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = Number(draggableId);
    const newStatus = destination.droppableId;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
    } catch (err) {
      console.error(err);
      fetchTasks(); // Rollback on error
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-accent" size={48} />
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kanban Board</h1>
          <p className="text-slate-500">Drag and drop tasks to manage workflow</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-accent text-white px-4 py-2 rounded-xl font-medium flex items-center hover:bg-accent/90 transition-all"
        >
          <Plus size={20} className="mr-2" />
          Add Task
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex space-x-6 overflow-x-auto pb-4 min-h-0">
          {COLUMNS.map((column) => (
            <div key={column} className="flex-shrink-0 w-80 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-700">{column}</h3>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {tasks.filter(t => t.status === column).length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <Droppable droppableId={column}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 p-3 space-y-3 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-slate-200/50' : ''}`}
                  >
                    {tasks
                      .filter(t => t.status === column)
                      .map((task, index) => (
                        // @ts-ignore
                        <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl' : ''}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <PriorityBadge priority={task.priority} />
                                <button className="text-slate-300 hover:text-slate-500">
                                  <MoreHorizontal size={16} />
                                </button>
                              </div>
                              <h4 className="font-bold text-slate-900 mb-2">{task.title}</h4>
                              <p className="text-slate-500 text-xs line-clamp-2 mb-4">{task.description}</p>
                              
                              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div className="flex items-center space-x-3 text-slate-400">
                                  <div className="flex items-center text-[10px]">
                                    <MessageSquare size={12} className="mr-1" />
                                    3
                                  </div>
                                  <div className="flex items-center text-[10px]">
                                    <Paperclip size={12} className="mr-1" />
                                    2
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  {task.due_date && (
                                    <div className="flex items-center text-[10px] text-slate-500 mr-3">
                                      <Calendar size={12} className="mr-1" />
                                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                  )}
                                  <div className="w-6 h-6 rounded-full bg-slate-200 border border-white"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <TaskModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={fetchTasks} 
      />
    </div>
  );
}
