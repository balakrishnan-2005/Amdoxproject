import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Kanban from './pages/Kanban';
import TaskList from './pages/TaskList';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import { useAuthStore } from './store';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { token, user, initialized } = useAuthStore();
  
  if (!initialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'Admin') return <Navigate to="/" />;
  
  return <Layout>{children}</Layout>;
};

export default function App() {
  const { setAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const user = session.user;
        setAuth({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata.name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata.role || 'Viewer',
          avatar: user.user_metadata.avatar
        }, session.access_token);
      }
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const user = session.user;
        setAuth({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata.name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata.role || 'Viewer',
          avatar: user.user_metadata.avatar
        }, session.access_token);
      } else {
        setAuth(null, null);
      }
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, [setAuth, setInitialized]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TaskList /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
