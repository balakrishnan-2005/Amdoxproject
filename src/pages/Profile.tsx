import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Camera, 
  Save,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../store';
import { authService } from '../services/auth';

export default function Profile() {
  const { user, setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await authService.updateProfile({
        name: formData.name,
        email: formData.email !== user?.email ? formData.email : undefined
      });
      
      setAuth({ ...user!, ...formData }, localStorage.getItem('token'));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-slate-500">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="relative inline-block mb-4">
              <img 
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=1B2B4B&color=fff`} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-slate-50 shadow-sm"
              />
              <button className="absolute bottom-0 right-0 p-2 bg-accent text-white rounded-full shadow-lg hover:bg-accent/90 transition-all">
                <Camera size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
            <p className="text-slate-500 text-sm">{user?.role}</p>
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center space-x-4 text-slate-400">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">12</p>
                <p className="text-[10px] uppercase font-bold tracking-wider">Tasks</p>
              </div>
              <div className="w-px h-8 bg-slate-100"></div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">4</p>
                <p className="text-[10px] uppercase font-bold tracking-wider">Projects</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-6">Personal Information</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Account Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    disabled
                    value={user?.role}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Role can only be changed by an administrator.</p>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                {success && (
                  <span className="text-emerald-600 text-sm font-medium">Profile updated successfully!</span>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-auto bg-accent text-white px-6 py-2 rounded-xl font-medium flex items-center hover:bg-accent/90 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
