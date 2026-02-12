import { Shield } from 'lucide-react';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useState } from 'react';
import AdminDashboard from './admin/AdminDashboard';
import LowBalanceNotification from './admin/LowBalanceNotification';

export default function AdminButton() {
  const { isAdmin, loading } = useIsAdmin();
  const [showDashboard, setShowDashboard] = useState(false);

  if (loading || !isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setShowDashboard(true)}
        className="fixed top-4 right-4 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium"
        title="Admin Dashboard"
      >
        <Shield className="w-4 h-4" />
        <span className="hidden sm:inline">Admin</span>
      </button>

      {showDashboard && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowDashboard(false)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Zavřít
            </button>
          </div>
          <div className="h-full overflow-auto">
            <AdminDashboard />
          </div>
        </div>
      )}

      <LowBalanceNotification />
    </>
  );
}
