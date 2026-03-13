import { create } from 'zustand';
import { supabase } from './lib/supabase';

interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
  initialized: boolean;
  setInitialized: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  initialized: false,
  setAuth: (user, token) => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
    
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    
    set({ user, token });
  },
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  setInitialized: (initialized) => set({ initialized }),
}));

interface AppState {
  notifications: any[];
  setNotifications: (notifs: any[]) => void;
  addNotification: (notif: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notif) => set((state) => ({ notifications: [notif, ...state.notifications] })),
}));
