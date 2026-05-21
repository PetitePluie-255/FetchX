import {
  FetchXError,
  type FetchXConfig,
  type FetchXResponse,
  type RequestOptions,
} from './types';

/**
 * Serialize query parameters to URL search string
 */
export function serializeParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(item => {
        searchParams.append(key, String(item));
      });
    } else {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * Build a full URL from baseURL, path, and query params
 */
export function buildURL(
  baseURL: string,
  url: string,
  params?: Record<string, unknown>
): string {
  let fullURL = url;

  if (baseURL) {
    fullURL = `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }

  if (params && Object.keys(params).length > 0) {
    const serializedParams = serializeParams(params);
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
    credentials: requestOptions.credentials ?? instanceConfig.credentials,
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
export async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return response.json() as Promise<unknown>;
  }

  if (contentType?.includes('text/')) {
    return response.text();
  }

  if (contentType?.includes('multipart/form-data')) {
    return response.formData();
  }

  return response.blob();
}

/**
 * Build a standardized FetchX response object
 */
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
    config,
  };
}

/**
 * Detect if an error is a cancellation/abort error
 * Compatible with FetchX errors, native AbortError, Axios CanceledError
 */
export function isCancel(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const error = value as FetchXError;

  return !!(
    error.code === 'ERR_CANCELED' ||
    error.code === 'ECONNABORTED' ||
    error.name === 'AbortError' ||
    error.name === 'CanceledError' ||
    error.__CANCEL__ === true ||
    (typeof error.message === 'string' &&
      (error.message.toLowerCase().includes('cancel') ||
        error.message.toLowerCase().includes('abort')))
  );
}
