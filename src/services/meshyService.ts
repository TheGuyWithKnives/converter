import { supabase } from './supabaseClient';

export interface MeshyTaskResult {
  result: string;
}

export interface TextTo3DOptions {
  prompt: string;
  mode: 'preview' | 'refine';
  art_style?: 'realistic' | 'cartoon' | 'low-poly' | 'sculpture' | 'pbr';
  negative_prompt?: string;
  ai_model?: string;
  seed?: number;
  enable_pbr?: boolean;
  texture_prompt?: string;
  preview_task_id?: string;
  topology?: 'quad' | 'triangle';
  target_polycount?: number;
}

export interface ImageTo3DOptions {
  image_url: string;
  enable_pbr?: boolean;
  should_remesh?: boolean;
  ai_model?: string;
  texture_prompt?: string;
  topology?: 'quad' | 'triangle';
  target_polycount?: number;
}

export interface RetextureOptions {
  model_url?: string;
  input_task_id?: string;
  text_style_prompt: string;
  image_style_url?: string;
  enable_pbr?: boolean;
  enable_original_uv?: boolean;
  ai_model?: string;
}

export interface RemeshOptions {
  model_url?: string;
  input_task_id?: string;
  target_formats?: string[];
  topology?: 'quad' | 'triangle';
  target_polycount?: number;
}

export interface RiggingOptions {
  model_url?: string;
  input_task_id?: string;
  height_meters?: number;
}

export interface AnimationOptions {
  rig_task_id: string;
  action_id: string;
  post_process?: {
    operation_type?: string;
    target_fps?: 24 | 25 | 30 | 60;
  };
}

export type TaskType =
  | 'text-to-3d'
  | 'image-to-3d'
  | 'rigging'
  | 'text-to-texture'
  | 'retexture'
  | 'remesh'
  | 'animation';

export const meshyService = {
  async createTextTo3D(prompt: string, options?: Partial<TextTo3DOptions>) {
    const payload: TextTo3DOptions = {
      prompt,
      mode: options?.mode || 'preview',
      art_style: options?.art_style || 'realistic',
      ...(options?.negative_prompt && { negative_prompt: options.negative_prompt }),
      ...(options?.ai_model && { ai_model: options.ai_model }),
      ...(options?.seed !== undefined && { seed: options.seed }),
      ...(options?.enable_pbr !== undefined && { enable_pbr: options.enable_pbr }),
      ...(options?.texture_prompt && { texture_prompt: options.texture_prompt }),
      ...(options?.preview_task_id && { preview_task_id: options.preview_task_id }),
      ...(options?.topology && { topology: options.topology }),
      ...(options?.target_polycount && { target_polycount: options.target_polycount }),
    };

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'text-to-3d', payload }
    });
    if (error) throw error;
    return data.result as string;
  },

  async refineTextTo3D(previewTaskId: string, texturePrompt?: string) {
    const payload = {
      mode: 'refine',
      preview_task_id: previewTaskId,
      ...(texturePrompt && { texture_prompt: texturePrompt }),
    };

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'text-to-3d', payload }
    });
    if (error) throw error;
    return data.result as string;
  },

  async createImageTo3D(imageUrl: string, options?: Partial<ImageTo3DOptions>) {
    const payload = {
      image_url: imageUrl,
      enable_pbr: options?.enable_pbr ?? true,
      should_remesh: options?.should_remesh ?? true,
      ...(options?.ai_model && { ai_model: options.ai_model }),
      ...(options?.texture_prompt && { texture_prompt: options.texture_prompt }),
      ...(options?.topology && { topology: options.topology }),
      ...(options?.target_polycount && { target_polycount: options.target_polycount }),
    };

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'image-to-3d', payload }
    });
    if (error) throw error;
    return data.result as string;
  },

  async createRigging(modelUrl: string, options?: Partial<RiggingOptions>) {
    const payload = {
      model_url: modelUrl,
      ...(options?.input_task_id && { input_task_id: options.input_task_id }),
      ...(options?.height_meters && { height_meters: options.height_meters }),
    };

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'rigging', payload }
    });
    if (error) throw error;
    return data.result as string;
  },

  async createRetexture(options: RetextureOptions) {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'retexture', payload: options }
    });
    if (error) throw error;
    return data.result as string;
  },

  async createRemesh(options: RemeshOptions) {
    const payload = {
      ...options,
      target_formats: options.target_formats || ['glb'],
    };

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'remesh', payload }
    });
    if (error) throw error;
    return data.result as string;
  },

  async createAnimation(options: AnimationOptions) {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'animation', payload: options }
    });
    if (error) throw error;
    return data.result as string;
  },

  async listAnimationLibrary() {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'list-animations', payload: {} }
    });
    if (error) throw error;
    return data as Array<{ action_id: string; name: string; category: string }>;
  },

  async getTaskStatus(taskId: string, type: TaskType) {
    let endpoint = '';
    switch (type) {
      case 'text-to-3d':
        endpoint = `/openapi/v2/text-to-3d/${taskId}`;
        break;
      case 'image-to-3d':
        endpoint = `/openapi/v1/image-to-3d/${taskId}`;
        break;
      case 'rigging':
        endpoint = `/openapi/v1/rigging/${taskId}`;
        break;
      case 'text-to-texture':
        endpoint = `/openapi/v1/text-to-texture/${taskId}`;
        break;
      case 'retexture':
        endpoint = `/openapi/v1/retexture/${taskId}`;
        break;
      case 'remesh':
        endpoint = `/openapi/v1/remesh/${taskId}`;
        break;
      case 'animation':
        endpoint = `/openapi/v1/animations/${taskId}`;
        break;
    }

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'get-task', payload: { taskId, endpoint } }
    });
    if (error) throw error;
    return data;
  }
};
