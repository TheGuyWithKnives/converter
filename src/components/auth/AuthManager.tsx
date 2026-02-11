import { useState } from 'react';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { PasswordResetModal } from './PasswordResetModal';

type AuthView = 'login' | 'register' | 'reset' | null;

interface AuthManagerProps {
  initialView?: AuthView;
  onClose: () => void;
}

export const AuthManager = ({ initialView = 'login', onClose }: AuthManagerProps) => {
  const [currentView, setCurrentView] = useState<AuthView>(initialView);

  if (currentView === 'login') {
    return (
      <LoginModal
        onClose={onClose}
        onSwitchToRegister={() => setCurrentView('register')}
        onSwitchToReset={() => setCurrentView('reset')}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <RegisterModal
        onClose={onClose}
        onSwitchToLogin={() => setCurrentView('login')}
      />
    );
  }

  if (currentView === 'reset') {
    return (
      <PasswordResetModal
        onClose={onClose}
        onSwitchToLogin={() => setCurrentView('login')}
      />
    );
  }

  return null;
};
