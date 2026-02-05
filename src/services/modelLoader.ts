import { supabase } from './supabaseClient';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2500, 5000];

async function fetchAsBlob(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

async function fetchViaProxy(url: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('meshy-api', {
    body: { action: 'proxy-model', payload: { url } },
  });

  if (error) throw error;

  const base64 = data.data;
  const contentType = data.contentType || 'model/gltf-binary';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: contentType });
  return URL.createObjectURL(blob);
}

export async function loadModelUrl(originalUrl: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const blobUrl = await fetchAsBlob(originalUrl);
      return blobUrl;
    } catch (err) {
      console.warn(`Model fetch attempt ${attempt + 1} failed:`, err);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }

  console.log('Direct fetch failed, trying proxy...');
  try {
    const blobUrl = await fetchViaProxy(originalUrl);
    return blobUrl;
  } catch (proxyErr) {
    console.error('Proxy fetch also failed:', proxyErr);
    throw new Error('Failed to load 3D model after all attempts.');
  }
}
