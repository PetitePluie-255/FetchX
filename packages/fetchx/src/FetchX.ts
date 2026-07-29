import {
  FetchXError,
  NetworkError,
  TimeoutError,
  CancelError,
  HTTPError,
  type FetchXConfig,
  type FetchXInstance,
  type FetchXResponse,
  type HttpMethod,
  type Plugin,
  type ProgressEvent,
  type RequestOptions,
} from './types';
import {
  RequestInterceptorManager,
  ResponseInterceptorManager,
} from './interceptors';
import {
  buildFetchXResponse,
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
  Uint8ArrayStream,
  SSEStream,
  NDJSONStream,
  type FetchXStream,
  type SSEEvent,
} from './stream';
import {
  trackDownloadProgress,
  trackUploadProgress,
  isStreamingNotSupportedError,
  markStreamingSupported,
} from './progress';
import { PluginManager } from './plugin';

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
  private pluginManager: PluginManager;

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
    this.pluginManager = new PluginManager(this);
  }

  /**
   * Public cache manager
   */
  get cache(): CacheStore {
    return this.cacheStore;
  }

  /**
   * Register a plugin. Returns an unregister function.
   */
  use(plugin: Plugin): () => void {
    return this.pluginManager.use(plugin);
  }

  /**
   * Unregister a plugin by name. Returns true if found.
   */
  unuse(name: string): boolean {
    return this.pluginManager.unuse(name);
  }

  /**
   * Generic request method (axios-style single config object)
   */
  async request<T = unknown>(
    options: RequestOptions
  ): Promise<FetchXResponse<T>> {
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
  ): Promise<FetchXResponse<T>> {
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
    let processedConfig = await this.interceptors.request.run(requestConfig);

    // Plugin onRequest hook
    processedConfig = await this.pluginManager.runOnRequest(
      processedConfig,
      {
        url: processedConfig.url ?? url,
        method: processedConfig.method ?? method,
      },
      processedConfig.plugins
    );

    // Build full URL
    const fullURL = buildURL(
      processedConfig.baseURL ?? '',
      processedConfig.url ?? url,
      processedConfig.params,
      processedConfig.paramsSerializer
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
      const cacheEntry = this.cacheStore.getEntry(cacheKey);
      if (cacheEntry !== undefined) {
        return {
          data: cacheEntry.data as T,
          status: cacheEntry.status,
          statusText: cacheEntry.statusText,
          headers: new Headers(cacheEntry.headers),
          config: processedConfig,
        } satisfies FetchXResponse<T>;
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
            const mergedSignal = mergeSignals(userSignal, dedupeSignal);

            // Check if any external signal is already aborted
            if (mergedSignal?.aborted) {
              throw new CancelError(processedConfig);
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
              // B1: For FormData, remove Content-Type so the browser auto-sets
              // the correct multipart/form-data boundary header
              if (serializedBody instanceof FormData) {
                headers.delete('content-type');
              }

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

              // Validate status — on failure, parse body and throw HTTPError
              if (
                processedConfig.throwHttpErrors !== false &&
                !validateStatus(trackedResponse.status)
              ) {
                const cloned = trackedResponse.clone();
                const errorBody = await parseResponse(
                  cloned,
                  processedConfig.responseType
                );
                const errorResponse = buildFetchXResponse(
                  errorBody,
                  trackedResponse,
                  processedConfig
                );
                throw new HTTPError(
                  trackedResponse.status,
                  errorResponse,
                  processedConfig
                );
              }

              return trackedResponse;
            } catch (fetchError: unknown) {
              // If already a FetchXError (from validateStatus), re-throw
              if (fetchError instanceof FetchXError) throw fetchError;

              if (fetchError instanceof Error) {
                // Timeout
                if (timedOut || fetchError.name === 'TimeoutError') {
                  throw new TimeoutError(timeout ?? 0, processedConfig);
                }

                // User-initiated cancel
                if (fetchError.name === 'AbortError') {
                  throw new CancelError(processedConfig);
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
                  throw new NetworkError(processedConfig);
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

        // --- Parse response (skip for stream type) ---
        let data: unknown;
        if (processedConfig.responseType === 'stream') {
          data = processedResponse.body;
        } else {
          data = await parseResponse(
            processedResponse,
            processedConfig.responseType
          );
        }

        // --- Build response ---
        const response = buildFetchXResponse(
          data as T,
          processedResponse,
          processedConfig
        );

        // Plugin onResponse hook
        const pluginResponse = await this.pluginManager.runOnResponse(
          response,
          { url: fullURL, method: processedConfig.method ?? method },
          processedConfig.plugins
        );

        // --- Cache set (skip for stream — cannot cache a ReadableStream) ---
        if (cacheKey && processedConfig.responseType !== 'stream') {
          const ttl =
            cacheConfig && typeof cacheConfig === 'object'
              ? cacheConfig.ttl
              : undefined;
          this.cacheStore.set(cacheKey, data, processedResponse, ttl);
        }

        return pluginResponse;
      } catch (error: unknown) {
        // Cleanup dedupe entry on error
        if (dedupeKey) {
          this._pending.delete(dedupeKey);
        }

        // Plugin onError hook — let plugins attempt recovery
        if (error instanceof FetchXError) {
          const recovered = await this.pluginManager.runOnError(
            error,
            { url: fullURL, method: processedConfig.method ?? method },
            processedConfig.plugins
          );
          if (recovered) return recovered as FetchXResponse<T>;
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
  async get<T = unknown>(
    url: string,
    options?: RequestOptions
  ): Promise<FetchXResponse<T>> {
    return this._request<T>('GET', url, undefined, options);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<FetchXResponse<T>> {
    return this._request<T>('POST', url, body, options);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<FetchXResponse<T>> {
    return this._request<T>('PUT', url, body, options);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    options?: RequestOptions
  ): Promise<FetchXResponse<T>> {
    return this._request<T>('DELETE', url, undefined, options);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<FetchXResponse<T>> {
    return this._request<T>('PATCH', url, body, options);
  }

  /**
   * HEAD request
   */
  async head<T = unknown>(
    url: string,
    options?: RequestOptions
  ): Promise<FetchXResponse<T>> {
    return this._request<T>('HEAD', url, undefined, options);
  }

  // ────────────────────────────────────────────
  //  Streaming methods (v1.4)
  // ────────────────────────────────────────────

  /**
   * Internal shared pipeline for streaming requests.
   * Reuses mergeConfig, request interceptors, buildURL, serializeBody,
   * signals, status validation, and connection timeout. Skips cache,
   * retry, dedupe, concurrency, response interceptors, and success-body parsing.
   */
  private async _streamRequest(
    method: HttpMethod,
    url: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<{
    response: Response;
    config: RequestOptions;
    controller: AbortController;
  }> {
    // Merge config
    const merged = mergeConfig(this.config, options);

    // Build request config for interceptors
    const requestConfig: RequestOptions = {
      method,
      url,
      body,
      ...merged,
    };

    // Run request interceptors (token injection etc.)
    let processedConfig = await this.interceptors.request.run(requestConfig);

    // Plugin onRequest hook
    processedConfig = await this.pluginManager.runOnRequest(
      processedConfig,
      {
        url: processedConfig.url ?? url,
        method: processedConfig.method ?? method,
      },
      processedConfig.plugins
    );

    // Build URL
    const fullURL = buildURL(
      processedConfig.baseURL ?? '',
      processedConfig.url ?? url,
      processedConfig.params
    );

    // Serialize body
    const serializedBody = serializeBody(processedConfig.body);

    // Build headers
    const headers = new Headers(processedConfig.headers ?? {});
    if (serializedBody instanceof FormData) {
      headers.delete('content-type');
    }

    // Wrap body for upload progress
    const { body: uploadBody } = trackUploadProgress(
      serializedBody,
      processedConfig.onUploadProgress
    );

    // Set up abort controller (connection timeout only)
    const controller = new AbortController();
    const userSignal = processedConfig.signal;
    const connectTimeout =
      processedConfig.connectTimeout ?? processedConfig.timeout ?? 0;
    let timedOut = false;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (connectTimeout > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, connectTimeout);
    }

    // Chain external signals to our controller
    const onExternalAbort = () => controller.abort();
    userSignal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const response = await fetch(fullURL, {
        method: processedConfig.method ?? method,
        headers,
        body: uploadBody as BodyInit | undefined,
        signal: controller.signal,
        credentials: processedConfig.credentials,
      });

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      const validateStatus = processedConfig.validateStatus ?? isSuccessStatus;
      if (
        processedConfig.throwHttpErrors !== false &&
        !validateStatus(response.status)
      ) {
        const errorBody = await parseResponse(
          response.clone(),
          processedConfig.responseType
        );
        const errorResponse = buildFetchXResponse(
          errorBody,
          response,
          processedConfig
        );
        throw new HTTPError(response.status, errorResponse, processedConfig);
      }

      return { response, config: processedConfig, controller };
    } catch (error: unknown) {
      if (error instanceof FetchXError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        if (timedOut) {
          throw new TimeoutError(connectTimeout, processedConfig, 'connect');
        }
        throw new CancelError(processedConfig);
      }

      throw new NetworkError(processedConfig);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      userSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  /**
   * Raw Uint8Array stream. Defaults to GET.
   *
   * ```ts
   * const stream = api.stream('/download');
   * for await (const chunk of stream) { ... }
   * ```
   */
  async stream(
    url: string,
    options?: RequestOptions
  ): Promise<FetchXStream<Uint8Array>> {
    const merged = { method: 'GET' as HttpMethod, ...options };
    const { method = 'GET', body, ...rest } = merged;
    const { response, config, controller } = await this._streamRequest(
      method as HttpMethod,
      url,
      body,
      rest
    );
    const stream = new Uint8ArrayStream(
      response,
      config,
      controller,
      config.signal
    );
    return this.pluginManager.runOnStream(
      stream,
      { url, method },
      config.plugins
    );
  }

  /**
   * SSE (Server-Sent Events) stream. Defaults to POST with
   * `Accept: text/event-stream` and `Content-Type: application/json`.
   *
   * ```ts
   * const stream = api.sse('/chat/completions', { body: { messages } });
   * for await (const event of stream) {
   *   const chunk = JSON.parse(event.data);
   * }
   * ```
   */
  async sse(
    url: string,
    options?: RequestOptions
  ): Promise<FetchXStream<SSEEvent>> {
    const merged = {
      method: 'POST' as HttpMethod,
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      ...options,
    };
    const { method = 'POST', body, ...rest } = merged;
    const { response, config, controller } = await this._streamRequest(
      method as HttpMethod,
      url,
      body,
      rest
    );
    const sseStream = new SSEStream(
      response,
      config,
      controller,
      config.signal
    );
    return this.pluginManager.runOnStream(
      sseStream,
      { url, method },
      config.plugins
    );
  }

  /**
   * NDJSON (Newline-Delimited JSON) stream. Defaults to GET.
   *
   * ```ts
   * const stream = api.ndjson<LogEntry>('/logs/stream');
   * for await (const entry of stream) { ... }
   * ```
   */
  async ndjson<T = unknown>(
    url: string,
    options?: RequestOptions
  ): Promise<FetchXStream<T>> {
    const merged = { method: 'GET' as HttpMethod, ...options };
    const { method = 'GET', body, ...rest } = merged;
    const { response, config, controller } = await this._streamRequest(
      method as HttpMethod,
      url,
      body,
      rest
    );
    const ndjsonStream = new NDJSONStream<T>(
      response,
      config,
      controller,
      config.signal
    );
    return this.pluginManager.runOnStream(
      ndjsonStream,
      { url, method },
      config.plugins
    );
  }
}

/**
 * Create a FetchX instance
 */
export function createFetchX<T = unknown>(
  config?: FetchXConfig
): FetchXInstance<T> {
  return new FetchX(config);
}

export default createFetchX;
