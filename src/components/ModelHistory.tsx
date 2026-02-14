import React, { useState, useEffect } from 'react';
import {
  Clock,
  Download,
  Trash2,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Box,
  Image,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader,
  BarChart3
} from 'lucide-react';
import {
  modelHistoryService,
  ModelHistoryEntry,
  ModelHistoryFilters
} from '../services/modelHistoryService';
import { useAuth } from '../contexts/AuthContext';

const MODEL_TYPES = [
  { value: '', label: 'Všechny typy' },
  { value: 'text-to-3d', label: 'Text na 3D' },
  { value: 'image-to-3d', label: 'Obrázek na 3D' },
  { value: 'retexture', label: 'Retextury' },
  { value: 'remesh', label: 'Remesh' },
  { value: 'rigging', label: 'Rigging' },
];

const STATUSES = [
  { value: '', label: 'Všechny stavy' },
  { value: 'processing', label: 'Zpracování' },
  { value: 'completed', label: 'Dokončeno' },
  { value: 'failed', label: 'Selhalo' },
];

const ITEMS_PER_PAGE = 10;

export default function ModelHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ModelHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ModelHistoryFilters>({
    model_type: '',
    status: '',
    search: '',
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    totalCreditsUsed: 0,
  });
  const [showStats, setShowStats] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await modelHistoryService.getUserHistory({
        ...filters,
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      });
      setEntries(result.entries);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    const stats = await modelHistoryService.getStatistics();
    setStatistics(stats);
  };

  useEffect(() => {
    if (user) {
      loadHistory();
      loadStatistics();
    }
  }, [user, currentPage, filters]);

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tento záznam?')) return;

    const success = await modelHistoryService.deleteEntry(id);
    if (success) {
      loadHistory();
      loadStatistics();
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.glb`;
    link.click();
  };

  const handleFilterChange = (key: keyof ModelHistoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-brand-accent animate-spin" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text-to-3d':
      case 'image-to-3d':
        return <Box className="w-5 h-5 text-brand-muted" />;
      case 'retexture':
        return <Image className="w-5 h-5 text-brand-muted" />;
      case 'remesh':
      case 'rigging':
        return <RefreshCw className="w-5 h-5 text-brand-muted" />;
      default:
        return <Box className="w-5 h-5 text-brand-muted" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!user) {
    return (
      <div className="bg-brand-panel border-2 border-brand-border rounded-2xl shadow-panel p-8 text-center">
        <p className="text-brand-muted">Přihlašte se pro zobrazení vaší historie modelů.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-brand-panel border-2 border-brand-border rounded-2xl shadow-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-brand-accent" />
            </div>
            <h2 className="text-2xl font-spartan font-bold text-brand-light">Historie modelů</h2>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-dark border border-brand-border hover:border-brand-accent/50 rounded-xl transition-all text-brand-light font-bold"
          >
            <BarChart3 className="w-4 h-4" />
            {showStats ? 'Skrýt' : 'Zobrazit'} Statistiky
          </button>
        </div>

        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-brand-dark border border-brand-border rounded-xl">
            <div className="text-center">
              <p className="text-sm text-brand-muted mb-1">Celkem modelů</p>
              <p className="text-2xl font-bold text-brand-light">{statistics.total}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-brand-muted mb-1">Dokončeno</p>
              <p className="text-2xl font-bold text-green-400">
                {statistics.byStatus['completed'] || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-brand-muted mb-1">Zpracování</p>
              <p className="text-2xl font-bold text-blue-400">
                {statistics.byStatus['processing'] || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-brand-muted mb-1">Použité kredity</p>
              <p className="text-2xl font-bold text-brand-accent">{statistics.totalCreditsUsed}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-muted" />
            <input
              type="text"
              placeholder="Hledat modely..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-dark border border-brand-border text-brand-light rounded-xl focus:border-brand-accent/50 focus:outline-none placeholder-brand-muted text-sm transition-colors"
            />
          </div>
          <select
            value={filters.model_type || ''}
            onChange={(e) => handleFilterChange('model_type', e.target.value)}
            className="px-4 py-2.5 bg-brand-dark border border-brand-border text-brand-light rounded-xl focus:border-brand-accent/50 focus:outline-none text-sm transition-colors"
          >
            {MODEL_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2.5 bg-brand-dark border border-brand-border text-brand-light rounded-xl focus:border-brand-accent/50 focus:outline-none text-sm transition-colors"
          >
            {STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-brand-accent animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Box className="w-16 h-16 text-brand-muted/30 mx-auto mb-4" />
            <p className="text-brand-muted">Žádné modely nenalezeny. Začněte tvořit!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-4 bg-brand-dark border border-brand-border hover:border-brand-accent/30 rounded-xl transition-all group"
                >
                  <div className="flex-shrink-0">
                    {entry.thumbnail_url ? (
                      <img
                        src={entry.thumbnail_url}
                        alt={entry.model_name}
                        className="w-16 h-16 object-cover rounded-lg border border-brand-border"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-brand-surface border border-brand-border rounded-lg flex items-center justify-center">
                        {getTypeIcon(entry.model_type)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-brand-light truncate">
                        {entry.model_name}
                      </h3>
                      {getStatusIcon(entry.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-brand-muted">
                      <span className="capitalize">{entry.model_type.replace('-', ' ')}</span>
                      <span>{entry.credits_used} kreditů</span>
                      <span>{formatDate(entry.created_at)}</span>
                    </div>
                    {entry.error_message && (
                      <p className="text-xs text-red-400 mt-1">{entry.error_message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.model_url && entry.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(entry.model_url!, entry.model_name)}
                        className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                        title="Stáhnout model"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Smazat záznam"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-brand-border">
                <p className="text-sm text-brand-muted">
                  Zobrazeno {(currentPage - 1) * ITEMS_PER_PAGE + 1} až{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, total)} z {total} záznamů
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-brand-border rounded-lg hover:border-brand-accent/50 hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-brand-light" />
                  </button>
                  <span className="px-4 py-2 text-sm font-bold text-brand-light">
                    Strana {currentPage} z {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-brand-border rounded-lg hover:border-brand-accent/50 hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-brand-light" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
