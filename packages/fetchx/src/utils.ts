import {
  FetchXError,
  NetworkError,
  TimeoutError,
  CancelError,
  HTTPError,
  type FetchXConfig,
  type FetchXResponse,
  type RequestOptions,
  type ResponseType,
} from './types';

/**
 * Serialize a single param value into key=value pairs for nested objects.
 * Uses bracket notation: { filter: { status: 'active' } } → filter[status]=active
 */
function encodeParam(key: string, value: unknown): Array<[string, string]> {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => encodeParam(`${key}[]`, item));
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([subKey, subValue]) => encodeParam(`${key}[${subKey}]`, subValue)
    );
  }
  return [[key, String(value)]];
}

/**
 * Serialize query parameters to URL search string.
 * Supports nested objects via bracket notation.
 */
export function serializeParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    encodeParam(key, value).forEach(([k, v]) => {
      searchParams.append(k, v);
    });
  });

  return searchParams.toString();
}

/**
 * Build a full URL from baseURL, path, and query params
 */
export function buildURL(
  baseURL: string,
  url: string,
  params?: Record<string, unknown>,
  paramsSerializer?: (_params: Record<string, unknown>) => string
): string {
  let fullURL = url;

  if (baseURL) {
    fullURL = `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }

  if (params && Object.keys(params).length > 0) {
    const serializer = paramsSerializer ?? serializeParams;
    const serializedParams = serializer(params);
    if (serializedParams) {
      const separator = fullURL.includes('?') ? '&' : '?';
      fullURL += separator + serializedParams;
    }
  }

  return fullURL;
}

/**
 * Serialize request body
 */
export function serializeBody(
  body: unknown
): string | FormData | Blob | ArrayBuffer | undefined {
  if (body === null || body === undefined) {
    return undefined;
  }

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  if (typeof body === 'object') {
    return JSON.stringify(body);
  }

  return String(body);
}

/**
 * Create a FetchXError instance
 */
export function createFetchXError(
  message: string,
  config?: RequestOptions,
  code?: string,
  request?: unknown
): FetchXError {
  return new FetchXError(message, config, code, request);
}

/**
 * Merge instance-level config with per-request options
 */
export function mergeConfig(
  instanceConfig: Readonly<FetchXConfig>,
  requestOptions: Readonly<RequestOptions>
): RequestOptions {
  return {
    baseURL: instanceConfig.baseURL,
    timeout: requestOptions.timeout ?? instanceConfig.timeout,
    connectTimeout:
      requestOptions.connectTimeout ?? instanceConfig.connectTimeout,
    idleTimeout: requestOptions.idleTimeout ?? instanceConfig.idleTimeout,
    throwHttpErrors:
      requestOptions.throwHttpErrors ?? instanceConfig.throwHttpErrors,
    credentials: requestOptions.credentials ?? instanceConfig.credentials,
    validateStatus:
      requestOptions.validateStatus ?? instanceConfig.validateStatus,
    responseType: requestOptions.responseType ?? instanceConfig.responseType,
    dedupe: requestOptions.dedupe ?? instanceConfig.dedupe,
    retry: requestOptions.retry ?? instanceConfig.retry,
    cache: requestOptions.cache ?? instanceConfig.cache,
    maxConcurrency:
      requestOptions.maxConcurrency ?? instanceConfig.maxConcurrency,
    sanitizeConfig:
      requestOptions.sanitizeConfig ?? instanceConfig.sanitizeConfig,
    ...requestOptions,
    headers: {
      ...instanceConfig.headers,
      ...requestOptions.headers,
    },
  };
}

/**
 * Check if status code is in 2xx range
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Parse response body based on Content-Type
 */
export async function parseResponse(
  response: Response,
  responseType?: ResponseType
): Promise<unknown> {
  if (responseType) {
    switch (responseType) {
      case 'json':
        try {
          return await response.json();
        } catch {
          return null;
        }
      case 'text':
        return response.text();
      case 'blob':
        return response.blob();
      case 'arrayBuffer':
        return response.arrayBuffer();
      case 'formData':
        try {
          return await response.formData();
        } catch {
          return response.blob();
        }
      default:
        break;
    }
  }

  const contentType = response.headers.get('content-type')?.toLowerCase();

  if (contentType?.includes('application/json')) {
    try {
      return (await response.json()) as unknown;
    } catch {
      return null;
    }
  }

  if (contentType?.includes('text/')) {
    return response.text();
  }

  if (contentType?.includes('multipart/form-data')) {
    try {
      return await response.formData();
    } catch {
      return response.blob();
    }
  }

  return response.blob();
}

/**
 * Build a standardized FetchX response object
 */
/** Headers to strip from config when sanitizeConfig is enabled */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
]);

function sanitizeHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!headers) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!SENSITIVE_HEADERS.has(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Return the config shape that is safe to expose through responses and errors.
 */
export function sanitizeRequestConfig(config: RequestOptions): RequestOptions {
  return config.sanitizeConfig
    ? { ...config, headers: sanitizeHeaders(config.headers) }
    : config;
}

export function buildFetchXResponse<T = unknown>(
  data: T,
  response: Response,
  config: RequestOptions
): FetchXResponse<T> {
  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config: sanitizeRequestConfig(config),
  };
}

/**
 * Error type guards
 */
export function isNetworkError(value: unknown): value is NetworkError {
  return value instanceof NetworkError;
}

export function isTimeoutError(value: unknown): value is TimeoutError {
  return value instanceof TimeoutError;
}

export function isCancelError(value: unknown): value is CancelError {
  return value instanceof CancelError;
}

export function isHTTPError<T = unknown>(
  value: unknown
): value is HTTPError<T> {
  return value instanceof HTTPError;
}

/**
 * Detect if an error is a cancellation/abort error.
 * Covers CancelError, AbortError, and legacy ERR_CANCELED code.
 */
export function isCancel(value: unknown): boolean {
  return (
    isCancelError(value) ||
    (value instanceof Error && value.name === 'AbortError') ||
    (value instanceof Error && (value as FetchXError).code === 'ERR_CANCELED')
  );
}
