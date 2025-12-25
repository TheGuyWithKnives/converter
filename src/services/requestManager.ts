export class CancellableRequest {
  private abortController: AbortController;
  private isCancelled: boolean = false;

  constructor() {
    this.abortController = new AbortController();
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  cancel(reason?: string): void {
    if (!this.isCancelled) {
      this.isCancelled = true;
      this.abortController.abort(reason);
      console.log(`Request cancelled: ${reason || 'User cancelled'}`);
    }
  }

  get cancelled(): boolean {
    return this.isCancelled;
  }
}

export class RequestManager {
  private activeRequests: Map<string, CancellableRequest> = new Map();

  create(key: string): CancellableRequest {
    this.cancel(key);

    const request = new CancellableRequest();
    this.activeRequests.set(key, request);

    return request;
  }

  cancel(key: string, reason?: string): void {
    const request = this.activeRequests.get(key);
    if (request) {
      request.cancel(reason);
      this.activeRequests.delete(key);
    }
  }

  cancelAll(reason?: string): void {
    this.activeRequests.forEach((request, key) => {
      request.cancel(reason);
      this.activeRequests.delete(key);
    });
  }

  has(key: string): boolean {
    return this.activeRequests.has(key);
  }

  size(): number {
    return this.activeRequests.size;
  }
}

export const globalRequestManager = new RequestManager();

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit & { signal?: AbortSignal } = {},
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = retryConfig.initialDelay;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      if (options.signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const shouldRetry =
          attempt < retryConfig.maxRetries &&
          retryConfig.retryableStatuses?.includes(response.status);

        if (!shouldRetry) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        throw new Error(`HTTP ${response.status} - Retrying...`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;

      if (options.signal?.aborted || error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }

      if (attempt === retryConfig.maxRetries) {
        console.error(`Request failed after ${attempt + 1} attempts:`, lastError);
        throw lastError;
      }

      console.warn(`Request attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);

      await new Promise(resolve => setTimeout(resolve, delay));

      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
    }
  }

  throw lastError || new Error('Request failed');
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

export class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly cacheTimeout: number = 1000;

  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    timeout: number = this.cacheTimeout
  ): Promise<T> {
    const existing = this.pendingRequests.get(key);

    if (existing && Date.now() - existing.timestamp < timeout) {
      console.log(`Reusing pending request for key: ${key}`);
      return existing.promise;
    }

    const promise = requestFn();

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    promise
      .finally(() => {
        setTimeout(() => {
          const current = this.pendingRequests.get(key);
          if (current && current.promise === promise) {
            this.pendingRequests.delete(key);
          }
        }, timeout);
      })
      .catch(() => {});

    return promise;
  }

  clear(key?: string): void {
    if (key) {
      this.pendingRequests.delete(key);
    } else {
      this.pendingRequests.clear();
    }
  }

  has(key: string): boolean {
    return this.pendingRequests.has(key);
  }
}

export const globalDeduplicator = new RequestDeduplicator();
