import { supabase } from './supabaseClient';

export interface TextTo3DOptions {
  prompt: string;
  mode: 'preview' | 'refine';
  art_style?: 'realistic' | 'cartoon' | 'low-poly' | 'sculpture' | 'pbr';
  negative_prompt?: string;
  ai_model?: string;
  seed?: number;
  enable_pbr?: boolean;
  texture_prompt?: string;
  texture_image_url?: string;
  preview_task_id?: string;
  topology?: 'quad' | 'triangle';
  target_polycount?: number;
  should_remesh?: boolean;
  symmetry_mode?: 'off' | 'auto' | 'on';
  pose_mode?: 'a-pose' | 't-pose' | '';
  moderation?: boolean;
}

export interface ImageTo3DOptions {
  image_url: string;
  enable_pbr?: boolean;
  should_remesh?: boolean;
  ai_model?: string;
  texture_prompt?: string;
  texture_image_url?: string;
  topology?: 'quad' | 'triangle';
  target_polycount?: number;
  model_type?: 'standard' | 'lowpoly';
  symmetry_mode?: 'off' | 'auto' | 'on';
  pose_mode?: 'a-pose' | 't-pose' | '';
  save_pre_remeshed_model?: boolean;
  should_texture?: boolean;
  moderation?: boolean;
}

export interface RetextureOptions {
  model_url?: string;
  input_task_id?: string;
  text_style_prompt?: string;
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
  resize_height?: number;
  origin_at?: 'bottom' | 'center' | '';
  convert_format_only?: boolean;
}

export interface RiggingOptions {
  model_url?: string;
  input_task_id?: string;
  height_meters?: number;
  texture_image_url?: string;
}

export interface AnimationOptions {
  rig_task_id: string;
  action_id: string;
  post_process?: {
    operation_type?: 'change_fps' | 'fbx2usdz' | 'extract_armature';
    fps?: 24 | 25 | 30 | 60;
  };
}

export interface TextToImageOptions {
  ai_model: 'nano-banana' | 'nano-banana-pro';
  prompt: string;
  generate_multi_view?: boolean;
  pose_mode?: 'a-pose' | 't-pose';
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export interface ImageToImageOptions {
  ai_model: 'nano-banana' | 'nano-banana-pro';
  prompt: string;
  reference_image_urls: string[];
  generate_multi_view?: boolean;
}

export type TaskType =
  | 'text-to-3d'
  | 'image-to-3d'
  | 'rigging'
  | 'text-to-texture'
  | 'retexture'
  | 'remesh'
  | 'animation'
  | 'text-to-image'
  | 'image-to-image';

export interface BalanceResponse {
  balance: number;
}

export const meshyService = {
  async createTextTo3D(prompt: string, options?: Partial<TextTo3DOptions>) {
    const payload: Record<string, unknown> = {
      prompt,
      mode: options?.mode || 'preview',
    };

    if (options?.art_style) payload.art_style = options.art_style;
    if (options?.negative_prompt) payload.negative_prompt = options.negative_prompt;
    if (options?.ai_model) payload.ai_model = options.ai_model;
    if (options?.seed !== undefined) payload.seed = options.seed;
    if (options?.enable_pbr !== undefined) payload.enable_pbr = options.enable_pbr;
    if (options?.texture_prompt) payload.texture_prompt = options.texture_prompt;
    if (options?.texture_image_url) payload.texture_image_url = options.texture_image_url;
    if (options?.preview_task_id) payload.preview_task_id = options.preview_task_id;
    if (options?.topology) payload.topology = options.topology;
    if (options?.target_polycount) payload.target_polycount = options.target_polycount;
    if (options?.should_remesh !== undefined) payload.should_remesh = options.should_remesh;
    if (options?.symmetry_mode) payload.symmetry_mode = options.symmetry_mode;
    if (options?.pose_mode !== undefined) payload.pose_mode = options.pose_mode;
    if (options?.moderation !== undefined) payload.moderation = options.moderation;

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'text-to-3d', payload }
    });
    if (error) throw error;
    return data.result as string;
  },

  async refineTextTo3D(previewTaskId: string, texturePrompt?: string, textureImageUrl?: string, aiModel?: string) {
    const payload: Record<string, unknown> = {
      mode: 'refine',
      preview_task_id: previewTaskId,
    };
    if (texturePrompt) payload.texture_prompt = texturePrompt;
    if (textureImageUrl) payload.texture_image_url = textureImageUrl;
    if (aiModel) payload.ai_model = aiModel;

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'text-to-3d', payload }
    });
    if (error) throw error;
    return data.result as string;
  },

  async createImageTo3D(imageUrl: string, options?: Partial<ImageTo3DOptions>) {
    const payload: Record<string, unknown> = {
      image_url: imageUrl,
      enable_pbr: options?.enable_pbr ?? true,
      should_remesh: options?.should_remesh ?? true,
    };

    if (options?.ai_model) payload.ai_model = options.ai_model;
    if (options?.texture_prompt) payload.texture_prompt = options.texture_prompt;
    if (options?.texture_image_url) payload.texture_image_url = options.texture_image_url;
    if (options?.topology) payload.topology = options.topology;
    if (options?.target_polycount) payload.target_polycount = options.target_polycount;
    if (options?.model_type) payload.model_type = options.model_type;
    if (options?.symmetry_mode) payload.symmetry_mode = options.symmetry_mode;
    if (options?.pose_mode !== undefined) payload.pose_mode = options.pose_mode;
    if (options?.save_pre_remeshed_model !== undefined) payload.save_pre_remeshed_model = options.save_pre_remeshed_model;
    if (options?.should_texture !== undefined) payload.should_texture = options.should_texture;
    if (options?.moderation !== undefined) payload.moderation = options.moderation;

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'image-to-3d', payload }
    });
    if (error) throw error;
    return data.result as string;
  },

  async createRigging(modelUrl: string, options?: Partial<RiggingOptions>) {
    const payload: Record<string, unknown> = {
      model_url: modelUrl,
    };
    if (options?.input_task_id) payload.input_task_id = options.input_task_id;
    if (options?.height_meters) payload.height_meters = options.height_meters;
    if (options?.texture_image_url) payload.texture_image_url = options.texture_image_url;

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

  async createTextToImage(options: TextToImageOptions) {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'text-to-image', payload: options }
    });
    if (error) throw error;
    return data.result as string;
  },

  async createImageToImage(options: ImageToImageOptions) {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'image-to-image', payload: options }
    });
    if (error) throw error;
    return data.result as string;
  },

  async getBalance(): Promise<BalanceResponse> {
    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'balance', payload: {} }
    });
    if (error) throw error;
    return data as BalanceResponse;
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
      case 'text-to-image':
        endpoint = `/openapi/v1/text-to-image/${taskId}`;
        break;
      case 'image-to-image':
        endpoint = `/openapi/v1/image-to-image/${taskId}`;
        break;
    }

    const { data, error } = await supabase.functions.invoke('meshy-api', {
      body: { action: 'get-task', payload: { taskId, endpoint } }
    });
    if (error) throw error;
    return data;
  }
};
