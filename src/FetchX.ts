import {
  FetchXError,
  type FetchXConfig,
  type FetchXInstance,
  type HttpMethod,
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

    // Execute request interceptors
    const processedConfig = await this.interceptors.request.run(requestConfig);

    // Build full URL with baseURL and params
    const fullURL = buildURL(
      processedConfig.baseURL ?? '',
      processedConfig.url ?? url,
      processedConfig.params
    );

    // Serialize request body
    const serializedBody = serializeBody(processedConfig.body);

    // Build headers
    const headers = new Headers(processedConfig.headers ?? {});

    // Collect external signals
    const userSignal = processedConfig.signal;
    const cancelSignal = processedConfig.cancelToken?.signal;
    let dedupeKey: string | undefined;
    let dedupeSignal: AbortSignal | undefined;

    // Auto-dedup: cancel previous identical request before starting
    if (processedConfig.dedupe) {
      dedupeKey = `${method}:${fullURL}`;
      const existing = this._pending.get(dedupeKey);
      if (existing) {
        existing.abort();
      }
      const dedupeController = new AbortController();
      this._pending.set(dedupeKey, dedupeController);
      dedupeSignal = dedupeController.signal;
    }

    // Merge all external signals into one
    const mergedSignal = mergeSignals(userSignal, cancelSignal, dedupeSignal);

    // Check if any signal is already aborted
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

    // Set up timeout controller if timeout > 0
    if (processedConfig.timeout && processedConfig.timeout > 0) {
      const timeoutController = new AbortController();

      // Link merged external signals to timeout controller
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
      }, processedConfig.timeout);

      requestSignal = timeoutController.signal;
    }

    try {
      // Execute fetch
      const response = await fetch(fullURL, {
        method,
        headers,
        body: serializedBody,
        signal: requestSignal,
        credentials: processedConfig.credentials,
      });

      // Use validateStatus (or default 2xx) to determine success
      const statusValidator = processedConfig.validateStatus ?? isSuccessStatus;
      const responsePromise = statusValidator(response.status)
        ? Promise.resolve(response)
        : Promise.reject(
            new FetchXError(
              `Request failed with status ${response.status}`,
              processedConfig,
              'ERR_BAD_RESPONSE'
            )
          );

      // Execute response interceptors (fulfilled gets Response, rejected can recover)
      const processedResponse =
        await this.interceptors.response.run(responsePromise);

      // Parse response data (respect responseType if set)
      const data = await parseResponse(
        processedResponse,
        processedConfig.responseType
      );
      return data as T;
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Timeout
        if (timedOut || error.name === 'TimeoutError') {
          throw new FetchXError(
            'Request timeout',
            processedConfig,
            'ECONNABORTED'
          );
        }

        // User-initiated cancel
        if (error.name === 'AbortError') {
          throw new FetchXError(
            'Request canceled',
            processedConfig,
            'ERR_CANCELED'
          );
        }

        // Network errors
        if (
          error.name === 'TypeError' &&
          error.message.includes('fetch') === true
        ) {
          throw new FetchXError(
            'Network Error',
            processedConfig,
            'ERR_NETWORK'
          );
        }
      }

      throw error;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (dedupeKey) {
        this._pending.delete(dedupeKey);
      }
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
