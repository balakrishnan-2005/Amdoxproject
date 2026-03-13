import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Custom Express backend
});

// Note: Authentication is now handled via Supabase (see src/lib/supabase.ts)
// The Express backend still handles complex logic and SQLite persistence.

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
