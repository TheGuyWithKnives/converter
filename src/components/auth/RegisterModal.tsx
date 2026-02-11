import { useState, FormEvent } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterModal = ({ onClose, onSwitchToLogin }: RegisterModalProps) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Heslo musí mít alespoň 8 znaků' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Heslo musí obsahovat alespoň jedno velké písmeno' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Heslo musí obsahovat alespoň jedno malé písmeno' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Heslo musí obsahovat alespoň jedno číslo' };
    }
    return { valid: true };
  };

  const validateUsername = (username: string): boolean => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Vyplňte všechna povinná pole');
      return;
    }

    if (!validateEmail(email)) {
      setError('Neplatný formát emailu');
      return;
    }

    if (username && !validateUsername(username)) {
      setError('Username může obsahovat pouze písmena, čísla a podtržítko (3-20 znaků)');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message || 'Neplatné heslo');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hesla se neshodují');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(
      email,
      password,
      username || undefined,
      fullName || undefined
    );

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Tento email je již registrován'
          : signUpError.message
      );
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const getPasswordStrength = (): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Slabé', color: 'bg-red-500' };
    if (strength === 3) return { strength, label: 'Střední', color: 'bg-yellow-500' };
    if (strength === 4) return { strength, label: 'Silné', color: 'bg-green-500' };
    return { strength, label: 'Velmi silné', color: 'bg-green-600' };
  };

  const passwordStrength = getPasswordStrength();

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
            <h3 className="text-xl font-bold text-brand-light mb-2">Registrace úspěšná!</h3>
            <p className="text-brand-muted mb-4">
              Váš účet byl vytvořen. Nyní se můžete přihlásit.
            </p>
            <p className="text-sm text-brand-accent font-bold">🎁 Získali jste 50 kreditů zdarma!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/95 backdrop-blur-lg animate-fade-in overflow-y-auto py-8">
      <div className="w-full max-w-md mx-4 my-auto">
        <div className="bg-brand-panel rounded-2xl shadow-2xl border border-brand-border overflow-hidden">
          <div className="p-6 border-b border-brand-border flex items-center justify-between">
            <h2 className="text-2xl font-spartan font-bold text-brand-light">Registrace</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-brand-surface transition-colors text-brand-muted hover:text-brand-light"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-brand-light mb-2">
                Email <span className="text-brand-accent">*</span>
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

            <div>
              <label htmlFor="username" className="block text-sm font-bold text-brand-light mb-2">
                Username <span className="text-brand-muted text-xs">(volitelné)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-brand-border rounded-lg text-brand-light placeholder-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
                  placeholder="username123"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-bold text-brand-light mb-2">
                Celé jméno <span className="text-brand-muted text-xs">(volitelné)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-brand-border rounded-lg text-brand-light placeholder-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
                  placeholder="Jan Novák"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-brand-light mb-2">
                Heslo <span className="text-brand-accent">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-brand-border rounded-lg text-brand-light placeholder-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-brand-muted">Síla hesla:</span>
                    <span className="text-xs font-bold" style={{ color: passwordStrength.color.replace('bg-', 'text-') }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1 bg-brand-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-brand-light mb-2">
                Potvrdit heslo <span className="text-brand-accent">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-brand-border rounded-lg text-brand-light placeholder-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
                  placeholder="••••••••"
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
                  Registrace...
                </>
              ) : (
                'Zaregistrovat se'
              )}
            </button>

            <div className="text-center pt-4 border-t border-brand-border">
              <p className="text-sm text-brand-muted">
                Máte již účet?{' '}
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
