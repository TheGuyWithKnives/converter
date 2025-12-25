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
  if (!imageHash || typeof imageHash !== 'string') {
    console.error('Invalid imageHash provided to getCachedModel');
    return null;
  }

  if (imageHash.length !== 64) {
    console.error('Invalid imageHash length (expected 64 characters for SHA-256)');
    return null;
  }

  if (!/^[a-f0-9]+$/.test(imageHash)) {
    console.error('Invalid imageHash format (expected hex string)');
    return null;
  }

  if (instructions !== undefined && typeof instructions !== 'string') {
    console.error('Invalid instructions type');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('cached_models')
      .select('model_url, id, expires_at, accessed_at, access_count')
      .eq('image_hash', imageHash)
      .eq('instructions', instructions || '')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Cache lookup error:', error);
      return null;
    }

    if (data) {
      console.log('Found cached model!');

      const shouldVerify = Math.random() < 0.01;

      if (shouldVerify) {
        console.log('Performing random cache verification...');
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const headResponse = await fetch(data.model_url, {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!headResponse.ok) {
            console.log('❌ Cached model URL expired during verification');
            await supabase
              .from('cached_models')
              .delete()
              .eq('id', data.id);
            return null;
          }
        } catch (urlError) {
          console.warn('Cache verification failed (network error):', urlError);
        }
      }

      console.log('✅ Using cached model!');

      supabase
        .from('cached_models')
        .update({
          accessed_at: new Date().toISOString(),
          access_count: (data.access_count || 0) + 1
        })
        .eq('id', data.id)
        .then(() => console.log('Cache statistics updated'))
        .catch(err => console.warn('Failed to update cache stats:', err));

      return data.model_url;
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
  if (!imageHash || typeof imageHash !== 'string' || imageHash.length !== 64) {
    console.error('Invalid imageHash provided to saveCachedModel');
    return;
  }

  if (!modelUrl || typeof modelUrl !== 'string') {
    console.error('Invalid modelUrl provided to saveCachedModel');
    return;
  }

  try {
    new URL(modelUrl);
  } catch (e) {
    console.error('Invalid URL format for modelUrl:', modelUrl);
    return;
  }

  if (instructions !== undefined && typeof instructions !== 'string') {
    console.error('Invalid instructions type');
    return;
  }

  if (instructions && instructions.length > 5000) {
    console.error('Instructions too long (max 5000 characters)');
    return;
  }

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 23);

    const { error } = await supabase
      .from('cached_models')
      .insert({
        image_hash: imageHash,
        model_url: modelUrl,
        instructions: instructions || '',
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error('Failed to save to cache:', error);
    } else {
      console.log('Model saved to cache (expires:', expiresAt.toISOString(), ')');
    }
  } catch (error) {
    console.error('Cache save failed:', error);
  }
}

export async function cleanOldCache(daysOld: number = 7): Promise<void> {
  if (!Number.isFinite(daysOld) || daysOld < 0 || daysOld > 365) {
    console.error('Invalid daysOld parameter (must be between 0 and 365)');
    return;
  }

  try {
    const { error } = await supabase
      .from('cached_models')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Failed to clean old cache:', error);
    } else {
      console.log('Cleaned expired cache entries');
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}
