import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  AlertCircle,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
  Wallet,
  Clock,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BalanceLog {
  id: string;
  balance: number;
  last_checked: string;
  created_at: string;
}

interface CreditPricing {
  id: string;
  meshy_cost: number;
  user_price: number;
  margin_percent: number;
  active: boolean;
}

interface AdminNotification {
  id: string;
  type: string;
  message: string;
  threshold: number | null;
  current_balance: number | null;
  is_read: boolean;
  created_at: string;
}

interface UserStats {
  total_users: number;
  total_virtual_credits: number;
}

export default function AdminDashboard() {
  const [latestBalance, setLatestBalance] = useState<number | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<BalanceLog[]>([]);
  const [pricing, setPricing] = useState<CreditPricing | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    await Promise.all([
      loadBalance(),
      loadPricing(),
      loadUserStats(),
      loadNotifications(),
    ]);
  };

  const loadBalance = async () => {
    const { data, error } = await supabase
      .from('meshy_balance_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading balance:', error);
      return;
    }

    if (data && data.length > 0) {
      setLatestBalance(data[0].balance);
      setLastChecked(data[0].last_checked);
      setBalanceHistory(data);
    }
  };

  const loadPricing = async () => {
    const { data, error } = await supabase
      .from('credit_pricing')
      .select('*')
      .eq('active', true)
      .single();

    if (error) {
      console.error('Error loading pricing:', error);
      return;
    }

    setPricing(data);
  };

  const loadUserStats = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('credits');

    if (error) {
      console.error('Error loading user stats:', error);
      return;
    }

    const totalCredits = data?.reduce((sum, user) => sum + (user.credits || 0), 0) || 0;
    setUserStats({
      total_users: data?.length || 0,
      total_virtual_credits: totalCredits,
    });
  };

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    setNotifications(data || []);
  };

  const refreshBalance = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-meshy-balance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh balance');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Balance refreshed: ${result.balance} credits`);
        await loadDashboardData();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
      toast.error('Failed to refresh balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
    }
  };

  const calculateProfit = () => {
    if (!pricing || !userStats || latestBalance === null) return null;

    const realCostTotal = userStats.total_virtual_credits * pricing.meshy_cost;
    const userPaidTotal = userStats.total_virtual_credits * pricing.user_price;
    const profit = userPaidTotal - realCostTotal;

    return {
      realCost: realCostTotal,
      userPaid: userPaidTotal,
      profit,
      profitPercent: pricing.margin_percent,
    };
  };

  const profitData = calculateProfit();
  const isBalanceLow = latestBalance !== null && latestBalance < 1000;
  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">Meshy.ai Balance & Credit Management</p>
          </div>
          <button
            onClick={refreshBalance}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Balance
          </button>
        </div>

        {unreadNotifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {unreadNotifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-200 font-medium">{notification.message}</p>
                    <p className="text-red-300/70 text-sm mt-1">
                      {new Date(notification.created_at).toLocaleString('cs-CZ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => markNotificationAsRead(notification.id)}
                  className="text-red-300 hover:text-red-100 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`bg-slate-800/50 backdrop-blur rounded-xl p-6 border ${
            isBalanceLow ? 'border-red-500/30' : 'border-slate-700/50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Wallet className="w-6 h-6 text-blue-400" />
              </div>
              {isBalanceLow && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <p className="text-slate-400 text-sm mb-1">Meshy.ai Balance</p>
            <p className={`text-3xl font-bold ${
              isBalanceLow ? 'text-red-400' : 'text-white'
            }`}>
              {latestBalance !== null ? latestBalance.toLocaleString() : '—'}
            </p>
            <p className="text-slate-500 text-xs mt-2">Real API Credits</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <div className="p-2 bg-purple-500/10 rounded-lg mb-4 w-fit">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-slate-400 text-sm mb-1">Virtual Credits</p>
            <p className="text-3xl font-bold text-white">
              {userStats?.total_virtual_credits.toLocaleString() || '—'}
            </p>
            <p className="text-slate-500 text-xs mt-2">Across {userStats?.total_users || 0} users</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <div className="p-2 bg-green-500/10 rounded-lg mb-4 w-fit">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-slate-400 text-sm mb-1">Margin</p>
            <p className="text-3xl font-bold text-white">
              {pricing?.margin_percent || 0}%
            </p>
            <p className="text-slate-500 text-xs mt-2">Profit per credit</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <div className="p-2 bg-yellow-500/10 rounded-lg mb-4 w-fit">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="text-slate-400 text-sm mb-1">Est. Profit</p>
            <p className="text-3xl font-bold text-white">
              {profitData ? profitData.profit.toFixed(2) : '—'}
            </p>
            <p className="text-slate-500 text-xs mt-2">Kč from virtual credits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Balance History
            </h2>
            <div className="space-y-3">
              {balanceHistory.length > 0 ? (
                balanceHistory.map((log, index) => {
                  const prev = balanceHistory[index + 1];
                  const change = prev ? log.balance - prev.balance : 0;
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">{log.balance.toLocaleString()} credits</p>
                        <p className="text-slate-500 text-sm">
                          {new Date(log.created_at).toLocaleString('cs-CZ')}
                        </p>
                      </div>
                      {change !== 0 && (
                        <span className={`text-sm font-medium ${
                          change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {change > 0 ? '+' : ''}{change}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 text-center py-4">No balance history yet</p>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Credit Pricing
            </h2>
            {pricing && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">Meshy Cost (Real)</p>
                  <p className="text-2xl font-bold text-white">
                    {pricing.meshy_cost.toFixed(4)} Kč
                  </p>
                  <p className="text-slate-500 text-xs mt-1">per credit</p>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">User Price</p>
                  <p className="text-2xl font-bold text-white">
                    {pricing.user_price.toFixed(4)} Kč
                  </p>
                  <p className="text-slate-500 text-xs mt-1">per virtual credit</p>
                </div>

                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 text-sm mb-1">Profit per Credit</p>
                  <p className="text-2xl font-bold text-green-300">
                    {(pricing.user_price - pricing.meshy_cost).toFixed(4)} Kč
                  </p>
                  <p className="text-green-400/70 text-xs mt-1">
                    {pricing.margin_percent.toFixed(2)}% margin
                  </p>
                </div>

                {profitData && (
                  <div className="p-4 bg-slate-900/50 rounded-lg mt-4">
                    <p className="text-slate-400 text-sm mb-3">Financial Summary</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Real Cost:</span>
                        <span className="text-white">{profitData.realCost.toFixed(2)} Kč</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">User Paid:</span>
                        <span className="text-white">{profitData.userPaid.toFixed(2)} Kč</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                        <span className="text-green-400 font-medium">Total Profit:</span>
                        <span className="text-green-300 font-bold">{profitData.profit.toFixed(2)} Kč</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {lastChecked && (
          <div className="mt-6 text-center text-slate-500 text-sm">
            Last checked: {new Date(lastChecked).toLocaleString('cs-CZ')}
          </div>
        )}
      </div>
    </div>
  );
}
