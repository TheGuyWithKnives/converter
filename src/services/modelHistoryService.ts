import { supabase } from './supabaseClient';

export interface ModelHistoryEntry {
  id: string;
  user_id: string;
  model_name: string;
  model_type: 'text-to-3d' | 'image-to-3d' | 'retexture' | 'remesh' | 'rigging';
  status: 'processing' | 'completed' | 'failed';
  model_url?: string;
  thumbnail_url?: string;
  parameters: Record<string, any>;
  credits_used: number;
  task_id?: string;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateModelHistoryParams {
  model_name: string;
  model_type: ModelHistoryEntry['model_type'];
  status?: ModelHistoryEntry['status'];
  model_url?: string;
  thumbnail_url?: string;
  parameters?: Record<string, any>;
  credits_used?: number;
  task_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateModelHistoryParams {
  status?: ModelHistoryEntry['status'];
  model_url?: string;
  thumbnail_url?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface ModelHistoryFilters {
  model_type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class ModelHistoryService {
  async createEntry(params: CreateModelHistoryParams): Promise<ModelHistoryEntry | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('model_history')
        .insert({
          user_id: user.id,
          model_name: params.model_name,
          model_type: params.model_type,
          status: params.status || 'processing',
          model_url: params.model_url,
          thumbnail_url: params.thumbnail_url,
          parameters: params.parameters || {},
          credits_used: params.credits_used || 0,
          task_id: params.task_id,
          metadata: params.metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating model history entry:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createEntry:', error);
      return null;
    }
  }

  async updateEntry(id: string, params: UpdateModelHistoryParams): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('model_history')
        .update(params)
        .eq('id', id);

      if (error) {
        console.error('Error updating model history entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateEntry:', error);
      return false;
    }
  }

  async getEntry(id: string): Promise<ModelHistoryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('model_history')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching model history entry:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getEntry:', error);
      return null;
    }
  }

  async getUserHistory(filters: ModelHistoryFilters = {}): Promise<{
    entries: ModelHistoryEntry[];
    total: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { entries: [], total: 0 };
      }

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      let query = supabase
        .from('model_history')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters.model_type) {
        query = query.eq('model_type', filters.model_type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        query = query.ilike('model_name', `%${filters.search}%`);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching user history:', error);
        return { entries: [], total: 0 };
      }

      return {
        entries: data || [],
        total: count || 0,
      };
    } catch (error) {
      console.error('Error in getUserHistory:', error);
      return { entries: [], total: 0 };
    }
  }

  async deleteEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('model_history')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting model history entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEntry:', error);
      return false;
    }
  }

  async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    totalCreditsUsed: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          total: 0,
          byType: {},
          byStatus: {},
          totalCreditsUsed: 0,
        };
      }

      const { data, error } = await supabase
        .from('model_history')
        .select('model_type, status, credits_used')
        .eq('user_id', user.id);

      if (error || !data) {
        console.error('Error fetching statistics:', error);
        return {
          total: 0,
          byType: {},
          byStatus: {},
          totalCreditsUsed: 0,
        };
      }

      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let totalCreditsUsed = 0;

      data.forEach(entry => {
        byType[entry.model_type] = (byType[entry.model_type] || 0) + 1;
        byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
        totalCreditsUsed += entry.credits_used || 0;
      });

      return {
        total: data.length,
        byType,
        byStatus,
        totalCreditsUsed,
      };
    } catch (error) {
      console.error('Error in getStatistics:', error);
      return {
        total: 0,
        byType: {},
        byStatus: {},
        totalCreditsUsed: 0,
      };
    }
  }
}

export const modelHistoryService = new ModelHistoryService();
