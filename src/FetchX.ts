import {
  FetchXError,
  type FetchXConfig,
  type FetchXInstance,
  type HttpMethod,
  type ProgressEvent,
  type RequestOptions,
} from './types';
import {
  RequestInterceptorManager,
  ResponseInterceptorManager,
} from './interceptors';
import {
  buildURL,
  isSuccessStatus,
  mergeConfig,
  parseResponse,
  serializeBody,
} from './utils';
import { CacheStore, createCacheKey } from './cache';
import { ConcurrencyManager } from './concurrency';
import { executeWithRetry } from './retry';
import {
  trackDownloadProgress,
  trackUploadProgress,
  isStreamingNotSupportedError,
  markStreamingSupported,
} from './progress';

/**
 * Merge multiple AbortSignals into one.
 * - 0 signals → undefined
 * - 1 signal → returns it directly
 * - 2+ signals → creates a controller that aborts when any source aborts
 */
function mergeSignals(
  ...signals: Array<AbortSignal | undefined>
): AbortSignal | undefined {
  const valid = signals.filter(Boolean) as AbortSignal[];
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];

  const controller = new AbortController();
  for (const sig of valid) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      break;
    }
    sig.addEventListener(
      'abort',
      () => {
        controller.abort(sig.reason);
      },
      { once: true }
    );
  }
  return controller.signal;
}

/**
 * FetchX - A fetch-based HTTP client with axios-like API
 */
export class FetchX {
  private readonly config: FetchXConfig;

  public interceptors: {
    request: RequestInterceptorManager;
    response: ResponseInterceptorManager;
  };

  private cacheStore: CacheStore;
  private concurrency: ConcurrencyManager;

  private _pending = new Map<string, AbortController>();

  constructor(config: FetchXConfig = {}) {
    this.config = {
      timeout: 0,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };

    this.interceptors = {
      request: new RequestInterceptorManager(),
      response: new ResponseInterceptorManager(),
    };

    this.cacheStore = new CacheStore(config.cache);
    this.concurrency = new ConcurrencyManager(config.maxConcurrency);
  }

  /**
   * Public cache manager
   */
  get cache(): CacheStore {
    return this.cacheStore;
  }

  /**
   * Generic request method (axios-style single config object)
   */
  async request<T = unknown>(options: RequestOptions): Promise<T> {
    const { method = 'GET', url = '', body, ...rest } = options;
    return this._request<T>(method as HttpMethod, url, body, rest);
  }

  /**
   * Core request method (internal)
   */
  private async _request<T = unknown>(
    method: HttpMethod,
    url: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    // Merge global config with per-request options
    const merged = mergeConfig(this.config, options);

    // Build the initial request config for interceptors
    const requestConfig: RequestOptions = {
      method,
      url,
      body,
      ...merged,
    };

    // Run request interceptors
    const processedConfig = await this.interceptors.request.run(requestConfig);

    // Build full URL
    const fullURL = buildURL(
      processedConfig.baseURL ?? '',
      processedConfig.url ?? url,
      processedConfig.params
    );

    // Serialize body
    const serializedBody = serializeBody(processedConfig.body);

    // --- Cache check ---
    const cacheConfig = processedConfig.cache;
    let cacheKey: string | undefined;
    if (
      this.cacheStore.isCacheable(cacheConfig, processedConfig.method ?? method)
    ) {
      cacheKey = createCacheKey(
        processedConfig.method ?? method,
        fullURL,
        processedConfig.params,
        processedConfig.body
      );
      const cached = this.cacheStore.get<T>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // --- Concurrency gate ---
    await this.concurrency.acquire();

    try {
      // --- Dedupe setup (once per request, not per retry) ---
      let dedupeKey: string | undefined;
      let dedupeSignal: AbortSignal | undefined;

      if (processedConfig.dedupe) {
        dedupeKey = `${processedConfig.method ?? method}:${fullURL}`;
        const existing = this._pending.get(dedupeKey);
        if (existing) {
          existing.abort();
        }
        const dedupeController = new AbortController();
        this._pending.set(dedupeKey, dedupeController);
        dedupeSignal = dedupeController.signal;
      }

      // External signals (shared across retries)
      const userSignal = processedConfig.signal;
      const cancelSignal = processedConfig.cancelToken?.signal;
      const timeout = processedConfig.timeout;
      const validateStatus = processedConfig.validateStatus ?? isSuccessStatus;
      const onDownloadProgress: ((_e: ProgressEvent) => void) | undefined =
        processedConfig.onDownloadProgress;
      const onUploadProgress: ((_e: ProgressEvent) => void) | undefined =
        processedConfig.onUploadProgress;

      try {
        // --- Retry loop: wraps each fetch attempt ---
        const retryPromise = executeWithRetry<Response>(
          async () => {
            // Merge external signals
            const mergedSignal = mergeSignals(
              userSignal,
              cancelSignal,
              dedupeSignal
            );

            // Check if any external signal is already aborted
            if (mergedSignal?.aborted) {
              throw new FetchXError(
                'Request canceled',
                processedConfig,
                'ERR_CANCELED'
              );
            }

            let requestSignal: AbortSignal | undefined = mergedSignal;
            let timedOut = false;
            let timeoutId: ReturnType<typeof setTimeout> | undefined;

            // Timeout setup (fresh timeout for each retry)
            if (timeout && timeout > 0) {
              const timeoutController = new AbortController();

              if (mergedSignal) {
                mergedSignal.addEventListener(
                  'abort',
                  () => {
                    timeoutController.abort(mergedSignal.reason);
                  },
                  { once: true }
                );
              }

              timeoutId = setTimeout(() => {
                timedOut = true;
                timeoutController.abort();
              }, timeout);

              requestSignal = timeoutController.signal;
            }

            let duplex: 'half' | undefined;

            try {
              // Build headers
              const headers = new Headers(processedConfig.headers ?? {});

              // Wrap body for upload progress (if requested)
              const { body: uploadBody, duplex: d } = trackUploadProgress(
                serializedBody,
                onUploadProgress
              );
              duplex = d;

              // Execute fetch
              const rawResponse = await fetch(fullURL, {
                method: processedConfig.method ?? method,
                headers,
                body: uploadBody as BodyInit | undefined,
                signal: requestSignal,
                credentials: processedConfig.credentials,
                ...(duplex ? { duplex } : {}),
              } satisfies RequestInit);

              // First successful streaming upload — cache that this runtime supports it
              if (duplex) {
                markStreamingSupported(true);
              }

              // Track download progress
              const trackedResponse = trackDownloadProgress(
                rawResponse,
                onDownloadProgress
              );

              // Validate status
              if (!validateStatus(trackedResponse.status)) {
                throw new FetchXError(
                  `Request failed with status ${trackedResponse.status}`,
                  processedConfig,
                  'ERR_BAD_RESPONSE',
                  undefined,
                  trackedResponse.status
                );
              }

              return trackedResponse;
            } catch (fetchError: unknown) {
              // If already a FetchXError (from validateStatus), re-throw
              if (fetchError instanceof FetchXError) throw fetchError;

              if (fetchError instanceof Error) {
                // Timeout
                if (timedOut || fetchError.name === 'TimeoutError') {
                  throw new FetchXError(
                    'Request timeout',
                    processedConfig,
                    'ECONNABORTED'
                  );
                }

                // User-initiated cancel
                if (fetchError.name === 'AbortError') {
                  throw new FetchXError(
                    'Request canceled',
                    processedConfig,
                    'ERR_CANCELED'
                  );
                }

                // Streaming upload not supported (duplex: 'half' + ReadableStream)
                if (duplex) {
                  const msg = isStreamingNotSupportedError(fetchError);
                  if (msg) {
                    markStreamingSupported(false);
                    throw new FetchXError(
                      msg,
                      processedConfig,
                      'ERR_NOT_SUPPORTED'
                    );
                  }
                }

                // Network errors
                if (
                  fetchError.name === 'TypeError' &&
                  fetchError.message.includes('fetch') === true
                ) {
                  throw new FetchXError(
                    'Network Error',
                    processedConfig,
                    'ERR_NETWORK'
                  );
                }
              }

              throw fetchError;
            } finally {
              if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
              }
            }
          },
          processedConfig.retry,
          processedConfig.method ?? method
        );

        // --- Response interceptors (run once after retry loop) ---
        const processedResponse =
          await this.interceptors.response.run(retryPromise);

        // --- Parse response ---
        const data = await parseResponse(
          processedResponse,
          processedConfig.responseType
        );

        // --- Cache set ---
        if (cacheKey) {
          const ttl =
            cacheConfig && typeof cacheConfig === 'object'
              ? cacheConfig.ttl
              : undefined;
          this.cacheStore.set(cacheKey, data, processedResponse, ttl);
        }

        return data as T;
      } catch (error: unknown) {
        // Cleanup dedupe entry on error
        if (dedupeKey) {
          this._pending.delete(dedupeKey);
        }

        throw error;
      } finally {
        // Cleanup dedupe entry
        if (dedupeKey) {
          this._pending.delete(dedupeKey);
        }
      }
    } finally {
      // Release concurrency slot
      this.concurrency.release();
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('GET', url, undefined, options);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this._request<T>('POST', url, body, options);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this._request<T>('PUT', url, body, options);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('DELETE', url, undefined, options);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this._request<T>('PATCH', url, body, options);
  }

  /**
   * HEAD request
   */
  async head<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('HEAD', url, undefined, options);
  }
}

/**
 * Create a FetchX instance
 */
export function createFetchX(config?: FetchXConfig): FetchXInstance {
  return new FetchX(config);
}

export default createFetchX;
