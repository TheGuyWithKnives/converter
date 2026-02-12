import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

interface AdminNotification {
  id: string;
  type: string;
  message: string;
  threshold: number | null;
  current_balance: number | null;
  is_read: boolean;
  created_at: string;
}

export default function LowBalanceNotification() {
  const [notification, setNotification] = useState<AdminNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkForNotifications();

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
          filter: 'type=eq.low_balance'
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification;
          if (!newNotification.is_read) {
            setNotification(newNotification);
            setIsVisible(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkForNotifications = async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('type', 'low_balance')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking notifications:', error);
      return;
    }

    if (data) {
      setNotification(data);
      setIsVisible(true);
    }
  };

  const dismissNotification = async () => {
    if (!notification) return;

    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', notification.id);

    if (!error) {
      setIsVisible(false);
      setTimeout(() => setNotification(null), 300);
    }
  };

  const openMeshyDashboard = () => {
    window.open('https://app.meshy.ai/settings/billing', '_blank');
  };

  if (!notification || !isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-2xl border border-red-400 overflow-hidden max-w-md">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Low Balance Alert!</h3>
                <p className="text-red-100 text-sm">Meshy.ai Credits Running Low</p>
              </div>
            </div>
            <button
              onClick={dismissNotification}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-100 text-sm">Current Balance:</span>
              <span className="text-white font-bold text-xl">
                {notification.current_balance?.toLocaleString()} credits
              </span>
            </div>
            {notification.threshold && (
              <div className="flex items-center justify-between">
                <span className="text-red-100 text-sm">Threshold:</span>
                <span className="text-white font-medium">
                  {notification.threshold.toLocaleString()} credits
                </span>
              </div>
            )}
          </div>

          <p className="text-white/90 text-sm mb-4 leading-relaxed">
            Your Meshy.ai account is running low on credits. Please top up to ensure uninterrupted service for your users.
          </p>

          <div className="flex gap-3">
            <button
              onClick={openMeshyDashboard}
              className="flex-1 bg-white text-red-600 py-2 px-4 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Top Up Now
            </button>
            <button
              onClick={dismissNotification}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Dismiss
            </button>
          </div>

          <p className="text-red-100/70 text-xs mt-3 text-center">
            {new Date(notification.created_at).toLocaleString('cs-CZ')}
          </p>
        </div>

        <div className="h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-pulse" />
      </div>
    </div>
  );
}
