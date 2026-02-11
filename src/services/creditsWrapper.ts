import { supabase } from './supabaseClient';
import { deductCredits, checkSufficientCredits, CREDIT_COSTS } from './creditsService';

export interface CreditCheckResult {
  allowed: boolean;
  message?: string;
  currentBalance?: number;
  requiredCredits?: number;
}

export const checkAndDeductCredits = async (
  operationType: keyof typeof CREDIT_COSTS,
  description: string,
  metadata?: Record<string, unknown>
): Promise<CreditCheckResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        allowed: false,
        message: 'Musíte být přihlášeni pro použití této funkce',
      };
    }

    const requiredCredits = CREDIT_COSTS[operationType];

    const { sufficient, currentBalance } = await checkSufficientCredits(
      user.id,
      requiredCredits
    );

    if (!sufficient) {
      return {
        allowed: false,
        message: `Nedostatek kreditů. Potřebujete ${requiredCredits}, máte ${currentBalance}`,
        currentBalance,
        requiredCredits,
      };
    }

    const result = await deductCredits(
      user.id,
      requiredCredits,
      operationType,
      description,
      metadata
    );

    if (!result.success) {
      return {
        allowed: false,
        message: result.error || 'Nelze odečíst kredity',
        currentBalance,
        requiredCredits,
      };
    }

    return {
      allowed: true,
      currentBalance: result.newBalance,
      requiredCredits,
    };
  } catch (error) {
    return {
      allowed: false,
      message: error instanceof Error ? error.message : 'Chyba při ověřování kreditů',
    };
  }
};

export const getCreditCost = (operationType: keyof typeof CREDIT_COSTS): number => {
  return CREDIT_COSTS[operationType];
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
