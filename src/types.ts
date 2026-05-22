import type {
  RequestInterceptorManager,
  ResponseInterceptorManager,
} from './interceptors';

/**
 * HTTP method union type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

/**
 * Response type for forced parsing (overrides Content-Type detection)
 */
export type ResponseType =
  | 'json'
  | 'text'
  | 'blob'
  | 'arrayBuffer'
  | 'formData';

/**
 * Progress event for upload/download tracking
 */
export interface ProgressEvent {
  loaded: number;
  total?: number;
  percent?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry count (0 = disabled). Default: 0 */
  retries?: number;
  /** Initial retry delay in ms. Default: 1000 */
  delay?: number;
  /** Maximum retry delay cap in ms. Default: 30000 */
  maxDelay?: number;
  /** HTTP methods to retry on. Default: ['GET', 'HEAD'] */
  methods?: HttpMethod[];
  /** Custom retry condition. Default: network errors + 5xx */
  condition?: (_error: FetchXError, _attempt: number) => boolean;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** TTL in ms. Default: 60000 */
  ttl?: number;
  /** Maximum cache entries. Default: 100 */
  maxSize?: number;
  /** HTTP methods to cache. Default: ['GET'] */
  methods?: HttpMethod[];
}

/**
 * Global configuration for a FetchX instance
 */
export interface FetchXConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  credentials?: RequestCredentials;
  validateStatus?: (_status: number) => boolean;
  responseType?: ResponseType;
  dedupe?: boolean;
  /** Retry configuration. Falsy = no retry */
  retry?: RetryConfig | false;
  /** Cache configuration. `false` explicitly disables cache */
  cache?: CacheConfig | false;
  /** Max concurrent in-flight requests. 0 = unlimited */
  maxConcurrency?: number;
}

/**
 * Per-request options (includes all config fields as overrides)
 */
export interface RequestOptions extends Partial<FetchXConfig> {
  url?: string;
  params?: Record<string, unknown>;
  body?: unknown;
  method?: string;
  signal?: AbortSignal;
  cancelToken?: CancelToken;
  onDownloadProgress?: (_event: ProgressEvent) => void;
  onUploadProgress?: (_event: ProgressEvent) => void;
}

/**
 * Cancel token for request cancellation (axios-compatible API)
 */
export class CancelToken {
  private controller = new AbortController();

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  static source(): {
    token: CancelToken;
    cancel: (_reason?: string) => void;
  } {
    const token = new CancelToken();
    const cancel = (reason?: string) => {
      token.controller.abort(reason);
    };
    return { token, cancel };
  }
}

/**
 * Standardized response object
 */
export interface FetchXResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestOptions;
}

/**
 * FetchX error class
 */
export class FetchXError extends Error {
  readonly config?: RequestOptions;
  readonly code?: string;
  readonly status?: number;
  readonly request?: unknown;
  readonly response?: FetchXResponse;
  readonly isAxiosError = true;
  readonly __CANCEL__?: boolean;

  constructor(
    message: string,
    config?: RequestOptions,
    code?: string,
    request?: unknown,
    status?: number
  ) {
    super(message);
    this.name = 'FetchXError';
    this.config = config;
    this.code = code;
    this.request = request;
    this.status = status;
  }
}

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (
  _options: RequestOptions
) => Promise<RequestOptions> | RequestOptions;

/**
 * Response interceptor function type
 */
export type ResponseInterceptor = (
  _response: Response
) => Promise<Response> | Response;

/**
 * Cache manager public API exposed on FetchXInstance.cache
 */
export interface CacheManager {
  clear: () => void;
  delete: (_key: string) => boolean;
  has: (_key: string) => boolean;
  get: <T = unknown>(_key: string) => T | undefined;
  readonly size: number;
}

/**
 * FetchX instance public API
 */
export interface FetchXInstance {
  interceptors: {
    request: RequestInterceptorManager;
    response: ResponseInterceptorManager;
  };
  request: <T = unknown>(_config: RequestOptions) => Promise<T>;
  get: <T = unknown>(_url: string, _options?: RequestOptions) => Promise<T>;
  post: <T = unknown>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<T>;
  put: <T = unknown>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<T>;
  delete: <T = unknown>(_url: string, _options?: RequestOptions) => Promise<T>;
  patch: <T = unknown>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<T>;
  head: <T = unknown>(_url: string, _options?: RequestOptions) => Promise<T>;
  cache: CacheManager;
}
