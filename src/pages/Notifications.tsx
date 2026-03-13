import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Check, 
  Clock, 
  Trash2,
  Loader2
} from 'lucide-react';
import api from '../api';
import { useAppStore } from '../store';

export default function Notifications() {
  const { notifications, setNotifications } = useAppStore();
  const [loading, setLoading] = useState(false);

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)));
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500">Stay updated with your team's activity</p>
        </div>
        <button 
          onClick={markAllAsRead}
          disabled={loading || !notifications.some(n => !n.is_read)}
          className="text-accent text-sm font-medium hover:underline flex items-center disabled:opacity-50 disabled:no-underline"
        >
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Check size={16} className="mr-1" />}
          Mark all as read
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {notifications.length > 0 ? notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-6 flex items-start space-x-4 transition-colors ${notif.is_read ? 'bg-white' : 'bg-accent/5'}`}
            >
              <div className={`p-2 rounded-full flex-shrink-0 ${notif.is_read ? 'bg-slate-100 text-slate-400' : 'bg-accent text-white'}`}>
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <p className={`text-sm ${notif.is_read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                    {notif.content}
                  </p>
                  <div className="flex items-center space-x-2 ml-4">
                    {!notif.is_read && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="p-1 text-accent hover:bg-accent/10 rounded transition-all"
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button className="p-1 text-slate-300 hover:text-critical rounded transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider">
                  <Clock size={12} className="mr-1" />
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-500">
              <Bell className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="font-medium">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
