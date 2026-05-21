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
 * FetchX - A fetch-based HTTP client with axios-like API
 */
export class FetchX {
  private readonly config: FetchXConfig;

  public interceptors: {
    request: RequestInterceptorManager;
    response: ResponseInterceptorManager;
  };

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
   * Core request method
   */
  private async request<T = unknown>(
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

    // Handle signal and timeout
    const userSignal = processedConfig.signal;
    let requestSignal: AbortSignal | undefined = userSignal;
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Check if user signal is already aborted
    if (userSignal?.aborted) {
      throw new FetchXError(
        'Request canceled',
        processedConfig,
        'ERR_CANCELED'
      );
    }

    // Set up timeout controller if timeout > 0
    if (processedConfig.timeout && processedConfig.timeout > 0) {
      const timeoutController = new AbortController();

      // Link user signal to timeout controller
      if (userSignal) {
        userSignal.addEventListener(
          'abort',
          () => {
            timeoutController.abort(userSignal.reason);
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

      // Build response promise: resolve on 2xx, reject with FetchXError on non-2xx
      const responsePromise = isSuccessStatus(response.status)
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

      // Parse response data
      const data = await parseResponse(processedResponse);
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
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('POST', url, body, options);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PUT', url, body, options);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PATCH', url, body, options);
  }

  /**
   * HEAD request
   */
  async head<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('HEAD', url, undefined, options);
  }
}

/**
 * Create a FetchX instance
 */
export function createFetchX(config?: FetchXConfig): FetchXInstance {
  return new FetchX(config);
}

export default createFetchX;
