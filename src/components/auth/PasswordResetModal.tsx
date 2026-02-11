import { useState, FormEvent } from 'react';
import { X, Mail, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PasswordResetModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const PasswordResetModal = ({ onClose, onSwitchToLogin }: PasswordResetModalProps) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Vyplňte email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Neplatný formát emailu');
      return;
    }

    setLoading(true);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/95 backdrop-blur-lg animate-fade-in">
        <div className="w-full max-w-md mx-4">
          <div className="bg-brand-panel rounded-2xl shadow-2xl border border-brand-border p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-brand-light mb-2">Email odeslán!</h3>
            <p className="text-brand-muted mb-6">
              Pokud je email v našem systému, poslali jsme vám instrukce pro obnovení hesla.
            </p>
            <button
              onClick={onSwitchToLogin}
              className="w-full py-3 bg-brand-accent hover:opacity-90 text-white rounded-lg font-bold text-base transition-all"
            >
              Zpět na přihlášení
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/95 backdrop-blur-lg animate-fade-in">
      <div className="w-full max-w-md mx-4">
        <div className="bg-brand-panel rounded-2xl shadow-2xl border border-brand-border overflow-hidden">
          <div className="p-6 border-b border-brand-border flex items-center justify-between">
            <h2 className="text-2xl font-spartan font-bold text-brand-light">Obnovit heslo</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-brand-surface transition-colors text-brand-muted hover:text-brand-light"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-brand-muted">
              Zadejte svůj email a my vám pošleme odkaz pro obnovení hesla.
            </p>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-brand-light mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-brand-border rounded-lg text-brand-light placeholder-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
                  placeholder="vas@email.cz"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-accent hover:opacity-90 text-white rounded-lg font-bold text-base transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Odesílání...
                </>
              ) : (
                'Odeslat odkaz'
              )}
            </button>

            <div className="text-center pt-4 border-t border-brand-border">
              <p className="text-sm text-brand-muted">
                Vzpomněli jste si?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-brand-accent font-bold hover:underline"
                >
                  Přihlásit se
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
