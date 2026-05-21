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
  readonly request?: unknown;
  readonly response?: FetchXResponse;
  readonly isAxiosError = true;
  readonly __CANCEL__?: boolean;

  constructor(
    message: string,
    config?: RequestOptions,
    code?: string,
    request?: unknown
  ) {
    super(message);
    this.name = 'FetchXError';
    this.config = config;
    this.code = code;
    this.request = request;
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
}
