import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Trello, 
  ListTodo, 
  BarChart3, 
  Bell, 
  ShieldCheck, 
  UserCircle, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore, useAppStore } from '../store';
import { io } from 'socket.io-client';
import api from '../api';

const Sidebar = ({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) => {
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: Briefcase },
    { name: 'Kanban Board', path: '/kanban', icon: Trello },
    { name: 'Task List', path: '/tasks', icon: ListTodo },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldCheck });
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-white transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
      <div className="flex items-center justify-between h-16 px-6 bg-primary/80 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">Amdox Task</span>
        <button onClick={toggle} className="lg:hidden">
          <X size={24} />
        </button>
      </div>
      <nav className="mt-6 px-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
              location.pathname === item.path 
                ? 'bg-accent text-white' 
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <item.icon size={20} className="mr-3" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-0 w-full p-4 border-t border-white/10">
        <Link to="/profile" className="flex items-center px-4 py-3 text-white/70 hover:text-white transition-colors">
          <UserCircle size={20} className="mr-3" />
          <span className="font-medium">Profile</span>
        </Link>
      </div>
    </aside>
  );
};

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { user, logout } = useAuthStore();
  const notifications = useAppStore(state => state.notifications);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
      <button onClick={toggleSidebar} className="lg:hidden text-slate-600">
        <Menu size={24} />
      </button>
      <div className="hidden lg:block">
        <h2 className="text-lg font-semibold text-slate-800">Welcome back, {user?.name}</h2>
      </div>
      <div className="flex items-center space-x-4">
        <Link to="/notifications" className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-critical text-white text-[10px] font-bold flex items-center justify-center rounded-full">
              {unreadCount}
            </span>
          )}
        </Link>
        <div className="h-8 w-px bg-slate-200 mx-2"></div>
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <img 
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=1B2B4B&color=fff`} 
            alt="Avatar" 
            className="w-10 h-10 rounded-full border border-slate-200"
          />
          <button 
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="p-2 text-slate-400 hover:text-critical transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { user, token } = useAuthStore();
  const { setNotifications, addNotification } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Initialize WebSockets
    const socket = io();
    socket.emit('join_user', user?.id);
    
    socket.on('notification', (notif) => {
      addNotification(notif);
    });

    // Fetch initial notifications
    api.get('/notifications').then(res => setNotifications(res.data));

    return () => {
      socket.disconnect();
    };
  }, [token, user?.id]);

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
