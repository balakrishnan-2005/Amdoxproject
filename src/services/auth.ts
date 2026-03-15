import { supabase } from '../lib/supabase';
import api from '../api';

export const authService = {
  async login(email: string, password: string) {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } else {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    }
  },

  async register(name: string, email: string, password: string, role: string) {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role }
        }
      });
      if (error) throw error;
      return data;
    } else {
      const response = await api.post('/auth/register', { name, email, password, role });
      return response.data;
    }
  },

  async logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  async updateProfile(data: { name?: string, email?: string }) {
    if (supabase) {
      const { data: result, error } = await supabase.auth.updateUser({
        data: { name: data.name },
        email: data.email
      });
      if (error) throw error;
      return result;
    } else {
      const response = await api.put('/auth/profile', data);
      return response.data;
    }
  }
};
