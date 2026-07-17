/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  XCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { AppNotification } from '../types';

interface NotificationsViewProps {
  onRefreshNotifications: () => void;
  triggerRefresh: number;
}

export default function NotificationsView({ onRefreshNotifications, triggerRefresh }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications list', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [triggerRefresh]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
      onRefreshNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
      onRefreshNotifications();
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Notifications Pipeline</h1>
          <p className="text-slate-500 text-sm mt-1">Audit automated billing flags, project milestone conversion logs, and payment receipts confirmations.</p>
        </div>
        {unreadCount > 0 && (
          <button 
            id="btn-mark-all-notifications-read"
            onClick={handleMarkAllAsRead}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg flex items-center space-x-2 self-start shadow-md transition-all"
          >
            <CheckCheck size={14} />
            <span>Mark All Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* List and Cards */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-sm">
          <Bell className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="font-bold text-slate-700 text-lg">Clear Pipelines</h3>
          <p className="text-slate-400 text-sm mt-1">No automated system logs or alerts require attention.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            let typeColor = 'bg-blue-50 border-blue-100 text-blue-600';
            let Icon = Info;

            if (n.type === 'success') {
              typeColor = 'bg-emerald-50 border-emerald-100 text-emerald-600';
              Icon = CheckCircle2;
            } else if (n.type === 'warning') {
              typeColor = 'bg-amber-50 border-amber-100 text-amber-600';
              Icon = AlertTriangle;
            } else if (n.type === 'error') {
              typeColor = 'bg-rose-50 border-rose-100 text-rose-600';
              Icon = XCircle;
            }

            return (
              <div 
                key={n.id} 
                className={`flex items-start justify-between p-4 rounded-xl border transition-all duration-150 relative ${
                  n.read 
                    ? 'bg-white border-slate-100/70 text-slate-600' 
                    : 'bg-blue-50/20 border-blue-100/80 text-slate-800 shadow-sm shadow-blue-500/5'
                }`}
              >
                {/* Visual Unread Bar Indicator */}
                {!n.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-xl" />
                )}

                <div className="flex items-start space-x-4">
                  {/* Styled Icon Wrapper */}
                  <div className={`p-2.5 rounded-xl border mt-0.5 ${typeColor}`}>
                    <Icon size={16} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                    <p className="text-xs text-slate-600 leading-normal font-medium">{n.message}</p>
                    <span className="text-[10px] text-slate-400 font-bold block mt-2 uppercase tracking-wide flex items-center space-x-1">
                      <Clock size={10} />
                      <span>{new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                </div>

                {/* Mark read button */}
                {!n.read && (
                  <button 
                    id={`btn-read-notification-${n.id}`}
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors ml-4 shrink-0"
                    title="Mark Read"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
