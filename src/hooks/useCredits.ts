import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserCredits,
  getCreditTransactions,
  checkSufficientCredits,
  type UserCredits,
  type CreditTransaction,
} from '../services/creditsService';
import { supabase } from '../services/supabaseClient';

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getUserCredits(user.id);
      setCredits(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch credits');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }

    try {
      const data = await getCreditTransactions(user.id);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  }, [user]);

  const checkCredits = useCallback(
    async (requiredAmount: number): Promise<boolean> => {
      if (!user) return false;

      const result = await checkSufficientCredits(user.id, requiredAmount);
      return result.sufficient;
    },
    [user]
  );

  const refreshCredits = useCallback(() => {
    fetchCredits();
    fetchTransactions();
  }, [fetchCredits, fetchTransactions]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('credit-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCredits();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCredits, fetchTransactions]);

  return {
    credits,
    balance: credits?.balance ?? 0,
    transactions,
    loading,
    error,
    checkCredits,
    refreshCredits,
  };
};
