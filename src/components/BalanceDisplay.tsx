import { useState, useEffect, useCallback } from 'react';
import { meshyService } from '../services/meshyService';
import { Coins, RefreshCw } from 'lucide-react';

export const BalanceDisplay = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await meshyService.getBalance();
      setBalance(data.balance);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 120000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return (
    <button
      onClick={fetchBalance}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-dark/50 border border-brand-light/10 hover:border-brand-accent/30 transition-all group"
      title="Meshy.ai kredity - kliknete pro obnoveni"
    >
      <Coins className="w-3.5 h-3.5 text-brand-accent" />
      {loading ? (
        <RefreshCw className="w-3 h-3 text-brand-muted animate-spin" />
      ) : error ? (
        <span className="text-xs text-brand-muted">--</span>
      ) : (
        <span className="text-xs font-bold text-brand-light tabular-nums">
          {balance !== null ? balance.toLocaleString() : '--'}
        </span>
      )}
    </button>
  );
};
