/**
 * FetchX 核心实例化逻辑
 * 实例化、主流程、AbortController
 */

import type {
  FetchXConfig,
  RequestOptions,
  FetchXInstance,
  HttpMethod,
} from './types';
import {
  RequestInterceptorManager,
  ResponseInterceptorManager,
} from './interceptors';
import {
  buildURL,
  serializeBody,
  createFetchXError,
  mergeConfig,
  isSuccessStatus,
  parseResponse,
} from './utils';

export class FetchX implements FetchXInstance {
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
   * 通用请求方法
   */
  private async request<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(
    method: HttpMethod,
    url: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    // 合并配置
    const config = mergeConfig(this.config, options) as RequestOptions &
      FetchXConfig;

    // 构建请求配置
    const requestConfig: RequestOptions = {
      method,
      url,
      body,
      ...config,
    };

    // 执行请求拦截器
    const processedConfig = await this.interceptors.request.run(requestConfig);

    // 构建完整 URL
    const fullURL = buildURL(
      (processedConfig.baseURL as string) || '',
      (processedConfig.url as string) || url,
      processedConfig.params as Record<string, unknown>
    );

    // 序列化请求体
    const serializedBody = processedConfig.body
      ? serializeBody(processedConfig.body)
      : undefined;

    // 设置请求头
    const headers = new Headers(processedConfig.headers as HeadersInit);

    // 创建 AbortController 用于超时控制
    const { timeout } = processedConfig;
    let { signal } = processedConfig;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // 立即检查 signal 是否已经 aborted（避免发起无效请求）
    if (signal?.aborted) {
      const abortError = createFetchXError(
        'Request canceled',
        processedConfig,
        'ERR_CANCELED'
      );
      throw abortError;
    }

    // 如果有 timeout，我们需要创建一个新的 controller 来控制超时
    if (timeout && timeout > 0) {
      const controller = new AbortController();

      // 如果用户提供了 signal，监听它的 abort 事件
      if (signal) {
        if (signal.aborted) {
          controller.abort(signal.reason);
        } else {
          signal.addEventListener(
            'abort',
            () => {
              controller.abort(signal?.reason);
            },
            { once: true }
          );
        }
      }

      timeoutId = globalThis.setTimeout(() => {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        controller.abort(timeoutError);
      }, timeout);

      signal = controller.signal;
    }

    try {
      // 发起请求
      const response = await fetch(fullURL, {
        method,
        headers,
        body: serializedBody,
        signal,
        credentials: processedConfig.credentials as RequestCredentials,
      });

      // 执行响应拦截器
      const processedResponse = await this.interceptors.response.run(response);

      // 检查响应状态
      if (!isSuccessStatus(processedResponse.status)) {
        const error = createFetchXError(
          `Request failed with status ${processedResponse.status}`,
          processedConfig,
          'ERR_BAD_RESPONSE',
          null
        );
        throw error;
      }

      // 解析响应数据
      const data = await parseResponse(processedResponse);

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        // 处理超时错误
        if (
          error.name === 'TimeoutError' ||
          (error.name === 'AbortError' &&
            signal &&
            signal.reason instanceof Error &&
            signal.reason.name === 'TimeoutError')
        ) {
          const timeoutError = createFetchXError(
            'Request timeout',
            processedConfig,
            'ECONNABORTED'
          );
          throw timeoutError;
        }

        // 处理用户取消
        if (error.name === 'AbortError') {
          const abortError = createFetchXError(
            'Request canceled',
            processedConfig,
            'ERR_CANCELED'
          );
          throw abortError;
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          const networkError = createFetchXError(
            'Network Error',
            processedConfig,
            'ERR_NETWORK'
          );
          throw networkError;
        }
      }

      throw error;
    } finally {
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }
    }
  }

  /**
   * GET 请求
   */
  async get<T extends Record<string, unknown> = Record<string, unknown>>(
    url: string,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * POST 请求
   */
  async post<T extends Record<string, unknown> = Record<string, unknown>>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('POST', url, body, options);
  }

  /**
   * PUT 请求
   */
  async put<T extends Record<string, unknown> = Record<string, unknown>>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PUT', url, body, options);
  }

  /**
   * DELETE 请求
   */
  async delete<T extends Record<string, unknown> = Record<string, unknown>>(
    url: string,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  /**
   * PATCH 请求
   */
  async patch<T extends Record<string, unknown> = Record<string, unknown>>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PATCH', url, body, options);
  }

  /**
   * HEAD 请求
   */
  async head<T extends Record<string, unknown> = Record<string, unknown>>(
    url: string,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('HEAD', url, undefined, options);
  }
}

/**
 * 创建 FetchX 实例
 */
export function createFetchX(config?: FetchXConfig): FetchXInstance {
  return new FetchX(config);
}

export default createFetchX;
