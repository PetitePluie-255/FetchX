/**
 * FetchX 类型定义
 * 所有类型定义集中管理，确保类型安全
 */

export interface FetchXConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  credentials?: RequestCredentials;
  [key: string]: unknown;
}

export interface RequestOptions extends Omit<FetchXConfig, 'baseURL'> {
  url?: string;
  params?: Record<string, unknown>;
  body?: unknown;
  method?: string;
  signal?: AbortSignal;
  timeout?: number;
}

export interface FetchXResponse<T = Record<string, unknown>> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestOptions;
}

export interface FetchXError extends Error {
  config?: RequestOptions;
  code?: string;
  request?: unknown;
  response?: FetchXResponse;
  isAxiosError?: boolean;
  __CANCEL__?: boolean; // Axios 兼容：取消标识
}

export type RequestInterceptor = (
  _options: RequestOptions
) => Promise<RequestOptions> | RequestOptions;

export type ResponseInterceptor = (
  _response: Response
) => Promise<Response> | Response;

export interface FetchXInterceptor<T = unknown> {
  onFulfilled?: (_value: T) => T | Promise<T>;
  onRejected?: (_error: unknown) => unknown;
}

export interface FetchXInstance {
  get: <T extends Record<string, unknown> = Record<string, unknown>>(
    _url: string,
    _options?: RequestOptions
  ) => Promise<T>;
  post: <T extends Record<string, unknown> = Record<string, unknown>>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<T>;
  put: <T extends Record<string, unknown> = Record<string, unknown>>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<T>;
  delete: <T extends Record<string, unknown> = Record<string, unknown>>(
    _url: string,
    _options?: RequestOptions
  ) => Promise<T>;
  patch: <T extends Record<string, unknown> = Record<string, unknown>>(
    _url: string,
    _body?: unknown,
    _options?: RequestOptions
  ) => Promise<T>;
  head: <T extends Record<string, unknown> = Record<string, unknown>>(
    _url: string,
    _options?: RequestOptions
  ) => Promise<T>;

  interceptors: {
    request: {
      use: (_fn: RequestInterceptor) => void;
      eject: (_id: number) => void;
    };
    response: {
      use: (_fn: ResponseInterceptor) => void;
      eject: (_id: number) => void;
    };
  };
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
