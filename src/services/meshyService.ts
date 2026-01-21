import { supabase } from './supabaseClient';

export interface MeshyTaskResult {
  result: string; // Task ID
}

export const meshyService = {
  // 1. TEXT TO 3D
  async createTextTo3D(prompt: string, artStyle: 'realistic' | 'cartoon' | 'low-poly' = 'realistic') {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: {
        action: 'text-to-3d',
        payload: {
          mode: 'preview',
          prompt,
          art_style: artStyle,
        }
      }
    });
    if (error) throw error;
    return data.result as string; // Task ID
  },

  // 2. IMAGE TO 3D (Vylepšené)
  async createImageTo3D(imageUrl: string, enablePBR = true) {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: {
        action: 'image-to-3d',
        payload: {
          image_url: imageUrl,
          enable_pbr: enablePBR,
          should_remesh: true,
        }
      }
    });
    if (error) throw error;
    return data.result as string;
  },

  // 3. RIGGING (Animace kostry)
  async createRigging(modelUrl: string) {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: {
        action: 'rigging',
        payload: {
          model_url: modelUrl,
          category: 'humanoid' // Nebo 'quadruped' pro zvířata
        }
      }
    });
    if (error) throw error;
    return data.result as string;
  },

  // 4. TEXT TO TEXTURE (Přebarvení modelu)
  async createTextToTexture(modelUrl: string, prompt: string) {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: {
        action: 'text-to-texture',
        payload: {
          model_url: modelUrl,
          text_style_prompt: prompt,
        }
      }
    });
    if (error) throw error;
    return data.result as string;
  },

  // Kontrola stavu (Polling)
  async getTaskStatus(taskId: string, type: 'text-to-3d' | 'image-to-3d' | 'rigging' | 'text-to-texture') {
    // Pro Meshy V2 je endpoint pro status specifický podle typu
    let endpoint = '';
    if (type === 'text-to-3d') endpoint = `/openapi/v2/text-to-3d/${taskId}`;
    else if (type === 'image-to-3d') endpoint = `/openapi/v1/image-to-3d/${taskId}`;
    else if (type === 'rigging') endpoint = `/openapi/v1/rigging/${taskId}`;
    else if (type === 'text-to-texture') endpoint = `/openapi/v1/text-to-texture/${taskId}`;

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: {
        action: 'get-task',
        payload: { taskId, endpoint }
      }
    });
    if (error) throw error;
    return data;
  }
};