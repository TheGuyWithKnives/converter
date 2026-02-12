import { useState } from 'react';
import { Coins, Plus, History, User, LogOut, LogIn, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { PurchaseCreditsModal } from './credits/PurchaseCreditsModal';
import { TransactionHistory } from './credits/TransactionHistory';
import { AuthManager } from './auth/AuthManager';

export const BalanceDisplay = () => {
  const { user, signOut } = useAuth();
  const { balance, loading, credits } = useCredits();
  const [showPurchase, setShowPurchase] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent hover:opacity-90 transition-all text-white font-bold text-sm shadow-glow"
        >
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">Přihlásit se</span>
        </button>

        {showAuth && (
          <AuthManager
            initialView="login"
            onClose={() => setShowAuth(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPurchase(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all group ${
            credits?.is_admin
              ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]'
              : 'bg-gradient-to-r from-brand-accent/10 to-brand-accent/5 border-brand-accent/20 hover:border-brand-accent/40 hover:shadow-[0_0_20px_rgba(255,0,60,0.15)]'
          }`}
          title={credits?.is_admin ? 'Admin účet - Skutečný zůstatek z Meshy AI' : 'Klikněte pro nákup kreditů'}
        >
          {credits?.is_admin ? (
            <Crown className="w-4 h-4 text-yellow-500" />
          ) : (
            <Coins className="w-4 h-4 text-brand-accent" />
          )}
          <div className="flex flex-col items-start">
            <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${
              credits?.is_admin ? 'text-yellow-600' : 'text-brand-muted'
            }`}>
              {credits?.is_admin ? 'Meshy AI' : 'Kredity'}
            </span>
            <span className={`text-sm font-bold tabular-nums mt-0.5 ${
              credits?.is_admin ? 'text-yellow-500' : 'text-brand-accent'
            }`}>
              {loading ? '...' : balance.toLocaleString()}
            </span>
          </div>
          <Plus className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
            credits?.is_admin ? 'text-yellow-500' : 'text-brand-accent'
          }`} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl bg-brand-surface hover:bg-brand-dark border border-brand-border hover:border-brand-accent/30 transition-all"
            title="Uživatelské menu"
          >
            <User className="w-5 h-5 text-brand-muted" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-brand-panel rounded-xl border border-brand-border shadow-2xl z-50 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-brand-border">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-brand-light truncate flex-1">
                      {user.email}
                    </div>
                    {credits?.is_admin && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" title="Admin účet" />
                    )}
                  </div>
                  <div className="text-xs text-brand-muted mt-1">
                    {balance} kreditů {credits?.is_admin && '(Meshy AI)'}
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowHistory(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-surface transition-colors text-left"
                  >
                    <History className="w-4 h-4 text-brand-muted" />
                    <span className="text-sm text-brand-light">Historie transakcí</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowPurchase(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-surface transition-colors text-left"
                  >
                    <Plus className="w-4 h-4 text-brand-accent" />
                    <span className="text-sm text-brand-light">Nakoupit kredity</span>
                  </button>
                </div>

                <div className="p-2 border-t border-brand-border">
                  <button
                    onClick={() => {
                      signOut();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Odhlásit se</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showPurchase && (
        <PurchaseCreditsModal onClose={() => setShowPurchase(false)} />
      )}

      {showHistory && (
        <TransactionHistory onClose={() => setShowHistory(false)} />
      )}
    </>
  );
};
