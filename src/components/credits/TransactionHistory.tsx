import { useEffect, useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Clock, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCreditTransactions, type CreditTransaction } from '../../services/creditsService';

interface TransactionHistoryProps {
  onClose: () => void;
}

export const TransactionHistory = ({ onClose }: TransactionHistoryProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'purchase' | 'usage'>('all');

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) return;

      setLoading(true);
      const data = await getCreditTransactions(user.id);
      setTransactions(data);
      setLoading(false);
    };

    loadTransactions();
  }, [user]);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'purchase') return t.type === 'purchase' || t.type === 'bonus';
    if (filter === 'usage') return t.type === 'usage';
    return true;
  });

  const getTransactionIcon = (type: CreditTransaction['type']) => {
    if (type === 'usage') {
      return <ArrowDownCircle className="w-5 h-5 text-red-400" />;
    }
    return <ArrowUpCircle className="w-5 h-5 text-green-400" />;
  };

  const getTransactionColor = (type: CreditTransaction['type']) => {
    if (type === 'usage') return 'text-red-400';
    return 'text-green-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/95 backdrop-blur-lg animate-fade-in overflow-y-auto py-8">
      <div className="w-full max-w-4xl mx-4 my-auto">
        <div className="bg-brand-panel rounded-2xl shadow-2xl border border-brand-border overflow-hidden">
          <div className="p-6 border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-spartan font-bold text-brand-light">
                Historie transakcí
              </h2>
              <p className="text-sm text-brand-muted mt-1">
                Přehled všech operací s kredity
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-brand-surface transition-colors text-brand-muted hover:text-brand-light"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 border-b border-brand-border">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-muted" />
              <span className="text-sm font-bold text-brand-muted uppercase tracking-wider">
                Filtr
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-surface text-brand-muted hover:text-brand-light'
                }`}
              >
                Vše
              </button>
              <button
                onClick={() => setFilter('purchase')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === 'purchase'
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-surface text-brand-muted hover:text-brand-light'
                }`}
              >
                Nákupy
              </button>
              <button
                onClick={() => setFilter('usage')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === 'usage'
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-surface text-brand-muted hover:text-brand-light'
                }`}
              >
                Použití
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <Clock className="w-8 h-8 text-brand-muted animate-spin mx-auto mb-3" />
                <p className="text-brand-muted">Načítání transakcí...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-brand-muted">Žádné transakce k zobrazení</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 bg-brand-surface rounded-xl border border-brand-border hover:border-brand-accent/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getTransactionIcon(transaction.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-brand-light mb-1">
                            {transaction.description}
                          </div>
                          {transaction.operation_type && (
                            <div className="text-xs text-brand-muted mb-1">
                              {transaction.operation_type}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-brand-muted">
                            <Clock className="w-3 h-3" />
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div
                          className={`text-xl font-bold ${getTransactionColor(
                            transaction.type
                          )}`}
                        >
                          {transaction.type === 'usage' ? '' : '+'}
                          {transaction.amount}
                        </div>
                        <div className="text-xs text-brand-muted">
                          Zůstatek: {transaction.balance_after}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
