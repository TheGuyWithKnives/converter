import { supabase } from './supabaseClient';

export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  amount: number;
  balance_after: number;
  description: string;
  operation_type?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface PricingTier {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  bonus_credits: number;
  popular: boolean;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export const CREDIT_COSTS = {
  TEXT_TO_3D_MESH_MESHY6: 20,
  TEXT_TO_3D_MESH_OTHER: 10,
  TEXT_TO_3D_TEXTURE: 10,
  IMAGE_TO_3D_MESHY6_NO_TEXTURE: 20,
  IMAGE_TO_3D_MESHY6_WITH_TEXTURE: 30,
  IMAGE_TO_3D_OTHER_NO_TEXTURE: 5,
  IMAGE_TO_3D_OTHER_WITH_TEXTURE: 15,
  MULTI_IMAGE_NO_TEXTURE: 5,
  MULTI_IMAGE_WITH_TEXTURE: 15,
  RETEXTURE: 10,
  REMESH: 5,
  AUTO_RIGGING: 5,
  ANIMATION: 3,
} as const;

export const getUserCredits = async (userId: string): Promise<UserCredits | null> => {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }
};

export const getCreditTransactions = async (
  userId: string,
  limit = 50
): Promise<CreditTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    return [];
  }
};

export const deductCredits = async (
  userId: string,
  amount: number,
  operationType: string,
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string; newBalance?: number }> => {
  try {
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_operation_type: operationType,
      p_description: description,
      p_metadata: metadata || {},
    });

    if (error) throw error;

    if (data && data.success) {
      return {
        success: true,
        newBalance: data.new_balance,
      };
    } else {
      return {
        success: false,
        error: data?.error || 'Failed to deduct credits',
      };
    }
  } catch (error) {
    console.error('Error deducting credits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const addCredits = async (
  userId: string,
  amount: number,
  type: 'purchase' | 'bonus' | 'refund',
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string; newBalance?: number }> => {
  try {
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description,
      p_metadata: metadata || {},
    });

    if (error) throw error;

    if (data && data.success) {
      return {
        success: true,
        newBalance: data.new_balance,
      };
    } else {
      return {
        success: false,
        error: data?.error || 'Failed to add credits',
      };
    }
  } catch (error) {
    console.error('Error adding credits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const getPricingTiers = async (): Promise<PricingTier[]> => {
  try {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pricing tiers:', error);
    return [];
  }
};

export const checkSufficientCredits = async (
  userId: string,
  requiredAmount: number
): Promise<{ sufficient: boolean; currentBalance: number }> => {
  const credits = await getUserCredits(userId);

  if (!credits) {
    return { sufficient: false, currentBalance: 0 };
  }

  return {
    sufficient: credits.balance >= requiredAmount,
    currentBalance: credits.balance,
  };
};
