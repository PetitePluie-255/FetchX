import type {
  RequestInterceptorManager,
  ResponseInterceptorManager,
} from './interceptors';
import type { FetchXStream, SSEEvent, StreamEndReason } from './stream';

/**
 * HTTP method union type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

/**
 * Executes an HTTP request and returns a standards-compatible Response.
 */
export type RequestExecutor = (
  _input: RequestInfo | URL,
  _init?: RequestInit
) => Promise<Response>;

/**
 * Response type for forced parsing (overrides Content-Type detection)
 */
export type ResponseType =
  | 'json'
  | 'text'
  | 'blob'
  | 'arrayBuffer'
  | 'formData'
  | 'stream';

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
  /** Custom HTTP request executor. Defaults to globalThis.fetch. */
  requestExecutor?: RequestExecutor;
  /** Request timeout in ms. Used as the stream connection timeout fallback. */
  timeout?: number;
  /** Streaming connection timeout in ms. Covers waiting for response headers. */
  connectTimeout?: number;
  /** Streaming idle timeout in ms. Resets whenever a chunk is received. */
  idleTimeout?: number;
  /** Throw HTTPError when validateStatus rejects a response. Default: true */
  throwHttpErrors?: boolean;
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
  /** Strip sensitive headers (authorization, cookie, set-cookie, x-api-key)
   * from response.config.headers. Default: false */
  sanitizeConfig?: boolean;
}

/**
 * Per-request options (includes all config fields as overrides)
 */
export interface RequestOptions extends Partial<FetchXConfig> {
  url?: string;
  params?: Record<string, unknown>;
  paramsSerializer?: (_params: Record<string, unknown>) => string;
  body?: unknown;
  method?: string;
  signal?: AbortSignal;
  onDownloadProgress?: (_event: ProgressEvent) => void;
  onUploadProgress?: (_event: ProgressEvent) => void;
  plugins?: Plugin[];
}

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
 * Network error — DNS failure, CORS, offline
 */
export class NetworkError extends FetchXError {
  constructor(config?: RequestOptions) {
    super('Network Error', config, 'ERR_NETWORK');
    this.name = 'NetworkError';
  }
}

/**
 * Request timeout error
 */
export class TimeoutError extends FetchXError {
  readonly timeout: number;
  readonly phase: 'request' | 'connect' | 'idle';

  constructor(
    timeout: number,
    config?: RequestOptions,
    phase: 'request' | 'connect' | 'idle' = 'request'
  ) {
    super('Request timeout', config, 'ECONNABORTED');
    this.name = 'TimeoutError';
    this.timeout = timeout;
    this.phase = phase;
  }
}

/**
 * Request canceled by user (AbortController)
 */
export class CancelError extends FetchXError {
  constructor(config?: RequestOptions) {
    super('Request canceled', config, 'ERR_CANCELED');
    this.name = 'CancelError';
  }
}

/**
 * HTTP error with response body (4xx/5xx)
 */
export class HTTPError<T = unknown> extends FetchXError {
  readonly response: FetchXResponse<T>;

  constructor(
    status: number,
    response: FetchXResponse<T>,
    config?: RequestOptions
  ) {
    super(
      `Request failed with status ${status}`,
      config,
      'ERR_BAD_RESPONSE',
      undefined,
      status
    );
    this.name = 'HTTPError';
    this.response = response;
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
 *
 * T is the default response data type for all requests.
 * Each method still accepts an explicit type override via its own type parameter.
 */
export interface FetchXInstance<T = unknown> {
  interceptors: {
    request: RequestInterceptorManager;
    response: ResponseInterceptorManager;
  };
  request: <R = T>(_config: RequestOptions) => Promise<FetchXResponse<R>>;
  get: <R = T>(
    _url: string,
    _options?: RequestOptions
  ) => Promise<FetchXResponse<R>>;
  post: <R = T>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<FetchXResponse<R>>;
  put: <R = T>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<FetchXResponse<R>>;
  delete: <R = T>(
    _url: string,
    _options?: RequestOptions
  ) => Promise<FetchXResponse<R>>;
  patch: <R = T>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<FetchXResponse<R>>;
  head: <R = T>(
    _url: string,
    _options?: RequestOptions
  ) => Promise<FetchXResponse<R>>;
  stream: (
    _url: string,
    _options?: RequestOptions
  ) => Promise<FetchXStream<Uint8Array>>;
  sse: (
    _url: string,
    _options?: RequestOptions
  ) => Promise<FetchXStream<SSEEvent>>;
  ndjson: <R = T>(
    _url: string,
    _options?: RequestOptions
  ) => Promise<FetchXStream<R>>;
  cache: CacheManager;
  use: (_plugin: Plugin) => () => void;
  unuse: (_name: string) => boolean;
}

/**
 * Plugin context passed to lifecycle hooks
 */
export interface PluginContext {
  /** Request URL (after baseURL resolution) */
  url: string;
  /** HTTP method */
  method: string;
}

/**
 * A FetchX plugin that hooks into request/response lifecycle.
 *
 * Each hook receives a PluginContext with request metadata.
 * Hooks run in priority order (lower priority value = runs first).
 */
export interface Plugin {
  /** Unique plugin name */
  name: string;
  /** Execution priority. Lower runs first. Default: 0 */
  priority?: number;
  /** Called when the plugin is registered via api.use() */
  onInit?: (_instance: FetchXInstance) => void | Promise<void>;
  /** Called after request interceptors, before fetch. Can modify RequestOptions. */
  onRequest?: (
    _config: RequestOptions,
    _context: PluginContext
  ) => RequestOptions | Promise<RequestOptions>;
  /** Called after response is parsed, before returning. Can modify response. */
  onResponse?: (
    _response: FetchXResponse,
    _context: PluginContext
  ) => FetchXResponse | Promise<FetchXResponse>;
  /** Called on errors. Return a FetchXResponse to recover from the error. */
  onError?: (
    _error: FetchXError,
    _context: PluginContext
  ) =>
    | FetchXResponse
    | null
    | undefined
    | Promise<FetchXResponse | null | undefined>;
  /** Called when a stream is created (stream/sse/ndjson). Can wrap the stream. */
  onStream?: (
    _stream: FetchXStream<unknown>,
    _context: PluginContext
  ) => FetchXStream<unknown> | Promise<FetchXStream<unknown>>;
  /** Called once when a stream completes or is canceled. */
  onStreamEnd?: (
    _stream: FetchXStream<unknown>,
    _reason: StreamEndReason,
    _context: PluginContext
  ) => void | Promise<void>;
  /** Called once when stream creation or consumption fails. */
  onStreamError?: (
    _error: unknown,
    _stream: FetchXStream<unknown> | undefined,
    _context: PluginContext
  ) => void | Promise<void>;
}
