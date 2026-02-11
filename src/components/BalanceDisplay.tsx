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
      className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-accent/10 to-brand-accent/5 border border-brand-accent/20 hover:border-brand-accent/40 transition-all group hover:shadow-[0_0_20px_rgba(255,0,60,0.15)]"
      title="Meshy.ai kredity - kliknete pro obnoveni"
    >
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-brand-accent" />
        <div className="flex flex-col items-start">
          <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider leading-none">Kredity</span>
          {loading ? (
            <RefreshCw className="w-3 h-3 text-brand-muted animate-spin mt-0.5" />
          ) : error ? (
            <span className="text-sm font-bold text-brand-muted mt-0.5">--</span>
          ) : (
            <span className="text-sm font-bold text-brand-accent tabular-nums mt-0.5">
              {balance !== null ? balance.toLocaleString() : '--'}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
