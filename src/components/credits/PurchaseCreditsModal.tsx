import { useState, useEffect } from 'react';
import { X, Zap, Check, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { getPricingTiers, addCredits, type PricingTier } from '../../services/creditsService';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../hooks/useCredits';

interface PurchaseCreditsModalProps {
  onClose: () => void;
}

export const PurchaseCreditsModal = ({ onClose }: PurchaseCreditsModalProps) => {
  const { user } = useAuth();
  const { refreshCredits } = useCredits();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  useEffect(() => {
    const loadTiers = async () => {
      setLoading(true);
      const data = await getPricingTiers();
      setTiers(data);
      setLoading(false);
    };

    loadTiers();
  }, []);

  const handlePurchase = async () => {
    if (!selectedTier || !user) return;

    setProcessing(true);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const totalCredits = selectedTier.credits + selectedTier.bonus_credits;

      const result = await addCredits(
        user.id,
        totalCredits,
        'purchase',
        `Purchased ${selectedTier.name} pack - ${selectedTier.credits} credits${
          selectedTier.bonus_credits > 0 ? ` + ${selectedTier.bonus_credits} bonus` : ''
        }`,
        {
          tier_id: selectedTier.id,
          payment_method: paymentMethod,
          price_paid: selectedTier.price_usd,
        }
      );

      if (result.success) {
        refreshCredits();
        onClose();
      } else {
        setError(result.error || 'Purchase failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 text-brand-light">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Načítání...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/95 backdrop-blur-lg animate-fade-in overflow-y-auto py-8">
      <div className="w-full max-w-5xl mx-4 my-auto">
        <div className="bg-brand-panel rounded-2xl shadow-2xl border border-brand-border overflow-hidden">
          <div className="p-6 border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-spartan font-bold text-brand-light">Nakoupit kredity</h2>
              <p className="text-sm text-brand-muted mt-1">
                Vyberte balíček, který vám nejlépe vyhovuje
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-brand-surface transition-colors text-brand-muted hover:text-brand-light"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {tiers.map((tier) => {
                const isSelected = selectedTier?.id === tier.id;
                const totalCredits = tier.credits + tier.bonus_credits;

                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier)}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-brand-accent bg-brand-accent/5 shadow-glow'
                        : 'border-brand-border bg-brand-surface hover:border-brand-accent/30'
                    } ${tier.popular ? 'ring-2 ring-brand-accent/30' : ''}`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-accent rounded-full">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Nejoblíbenější
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-brand-light">{tier.name}</h3>
                      {isSelected && <Check className="w-6 h-6 text-brand-accent" />}
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-bold text-brand-light">
                          ${tier.price_usd}
                        </span>
                        <span className="text-brand-muted text-sm">USD</span>
                      </div>
                      <div className="text-sm text-brand-muted">
                        ${(tier.price_usd / totalCredits).toFixed(3)} za kredit
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-brand-accent" />
                        <span className="text-brand-light font-bold">
                          {tier.credits} kreditů
                        </span>
                      </div>
                      {tier.bonus_credits > 0 && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-bold">
                            +{tier.bonus_credits} bonus kreditů
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-brand-border">
                      <div className="text-xs text-brand-muted uppercase tracking-wider font-bold">
                        Celkem
                      </div>
                      <div className="text-2xl font-bold text-brand-accent">
                        {totalCredits} kreditů
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedTier && (
              <div className="border-t border-brand-border pt-6 space-y-4">
                <h3 className="text-lg font-bold text-brand-light mb-4">Způsob platby</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      paymentMethod === 'card'
                        ? 'border-brand-accent bg-brand-accent/5'
                        : 'border-brand-border bg-brand-surface hover:border-brand-accent/30'
                    }`}
                  >
                    <CreditCard className="w-6 h-6 text-brand-accent" />
                    <div className="text-left">
                      <div className="font-bold text-brand-light">Kreditní karta</div>
                      <div className="text-xs text-brand-muted">Visa, Mastercard</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      paymentMethod === 'paypal'
                        ? 'border-brand-accent bg-brand-accent/5'
                        : 'border-brand-border bg-brand-surface hover:border-brand-accent/30'
                    }`}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <span className="text-brand-accent font-bold">PP</span>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-brand-light">PayPal</div>
                      <div className="text-xs text-brand-muted">Rychlé a bezpečné</div>
                    </div>
                  </button>
                </div>

                <div className="bg-brand-surface rounded-xl p-4 border border-brand-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-brand-muted">Balíček:</span>
                    <span className="font-bold text-brand-light">{selectedTier.name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-brand-muted">Kredity:</span>
                    <span className="font-bold text-brand-light">{selectedTier.credits}</span>
                  </div>
                  {selectedTier.bonus_credits > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-400">Bonus:</span>
                      <span className="font-bold text-green-400">
                        +{selectedTier.bonus_credits}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-brand-border flex items-center justify-between">
                    <span className="font-bold text-brand-light">Celkem:</span>
                    <span className="text-2xl font-bold text-brand-accent">
                      ${selectedTier.price_usd}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={processing}
                  className="w-full py-4 bg-brand-accent hover:opacity-90 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Zpracování platby...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6" />
                      Dokončit nákup
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-brand-muted">
                  Kliknutím na "Dokončit nákup" souhlasíte s našimi obchodními podmínkami.
                  <br />
                  Demo platba - kredity budou okamžitě připsány.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
