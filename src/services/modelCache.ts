import { supabase } from './supabaseClient';

export interface CachedModel {
  id: string;
  image_hash: string;
  model_url: string;
  instructions: string | null;
  created_at: string;
}

export async function generateImageHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function getCachedModel(
  imageHash: string,
  instructions?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('cached_models')
      .select('model_url, id')
      .eq('image_hash', imageHash)
      .eq('instructions', instructions || '')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Cache lookup error:', error);
      return null;
    }

    if (data) {
      console.log('Found cached model! Verifying URL...');

      // Verify the URL is still valid
      try {
        const headResponse = await fetch(data.model_url, {
          method: 'HEAD',
          cache: 'no-cache'
        });

        if (headResponse.ok) {
          console.log('✅ Cached model URL is valid!');
          return data.model_url;
        } else {
          console.log('❌ Cached model URL expired (HTTP', headResponse.status, ')');
          // Delete the invalid cache entry
          await supabase
            .from('cached_models')
            .delete()
            .eq('id', data.id);
          console.log('🗑️ Removed expired cache entry');
          return null;
        }
      } catch (urlError) {
        console.error('❌ Failed to verify cached URL:', urlError);
        // Delete the invalid cache entry
        await supabase
          .from('cached_models')
          .delete()
          .eq('id', data.id);
        console.log('🗑️ Removed invalid cache entry');
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Cache lookup failed:', error);
    return null;
  }
}

export async function saveCachedModel(
  imageHash: string,
  modelUrl: string,
  instructions?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('cached_models')
      .insert({
        image_hash: imageHash,
        model_url: modelUrl,
        instructions: instructions || '',
      });

    if (error) {
      console.error('Failed to save to cache:', error);
    } else {
      console.log('Model saved to cache');
    }
  } catch (error) {
    console.error('Cache save failed:', error);
  }
}

export async function cleanOldCache(daysOld: number = 7): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await supabase
      .from('cached_models')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('Failed to clean old cache:', error);
    } else {
      console.log(`Cleaned cache entries older than ${daysOld} days`);
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}
