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
  { value: '', label: 'All Types' },
  { value: 'text-to-3d', label: 'Text to 3D' },
  { value: 'image-to-3d', label: 'Image to 3D' },
  { value: 'retexture', label: 'Retexture' },
  { value: 'remesh', label: 'Remesh' },
  { value: 'rigging', label: 'Rigging' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
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
    if (!confirm('Are you sure you want to delete this entry?')) return;

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
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text-to-3d':
      case 'image-to-3d':
        return <Box className="w-5 h-5" />;
      case 'retexture':
        return <Image className="w-5 h-5" />;
      case 'remesh':
      case 'rigging':
        return <RefreshCw className="w-5 h-5" />;
      default:
        return <Box className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600">Please log in to view your model history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Model History</h2>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            {showStats ? 'Hide' : 'Show'} Statistics
          </button>
        </div>

        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Models</p>
              <p className="text-2xl font-bold text-gray-800">{statistics.total}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {statistics.byStatus['completed'] || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-blue-600">
                {statistics.byStatus['processing'] || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Credits Used</p>
              <p className="text-2xl font-bold text-purple-600">{statistics.totalCreditsUsed}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search models..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.model_type || ''}
            onChange={(e) => handleFilterChange('model_type', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {MODEL_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Box className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No models found. Start creating!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0">
                    {entry.thumbnail_url ? (
                      <img
                        src={entry.thumbnail_url}
                        alt={entry.model_name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        {getTypeIcon(entry.model_type)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {entry.model_name}
                      </h3>
                      {getStatusIcon(entry.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="capitalize">{entry.model_type.replace('-', ' ')}</span>
                      <span>{entry.credits_used} credits</span>
                      <span>{formatDate(entry.created_at)}</span>
                    </div>
                    {entry.error_message && (
                      <p className="text-sm text-red-600 mt-1">{entry.error_message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.model_url && entry.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(entry.model_url!, entry.model_name)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download model"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
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
