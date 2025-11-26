/**
 * FetchX 拦截器系统
 * 链式 add/remove、异步执行
 */

import type {
  RequestInterceptor,
  RequestOptions,
  ResponseInterceptor,
} from './types';

export class InterceptorManager<V, F = (_value: V) => V | Promise<V>> {
  private interceptors: Array<{
    id: number;
    fulfilled?: F;
    rejected?: (_error: unknown) => V | Promise<V>;
  }> = [];
  private nextId = 0;

  /**
   * 添加拦截器
   */
  use(fulfilled?: F, rejected?: (_error: unknown) => V | Promise<V>): number {
    const id = this.nextId++;
    this.interceptors.push({ id, fulfilled, rejected });
    return id;
  }

  /**
   * 移除拦截器
   */
  eject(id: number): void {
    const index = this.interceptors.findIndex(
      interceptor => interceptor.id === id
    );
    if (index !== -1) {
      this.interceptors.splice(index, 1);
    }
  }

  /**
   * 清空所有拦截器
   */
  clear(): void {
    this.interceptors = [];
  }

  /**
   * 获取所有拦截器
   */
  forEach(
    fn: (_interceptor: {
      id: number;
      fulfilled?: F;
      rejected?: (_error: unknown) => V | Promise<V>;
    }) => void
  ): void {
    this.interceptors.forEach(fn);
  }

  /**
   * 获取拦截器数量
   */
  get length(): number {
    return this.interceptors.length;
  }
}

export class RequestInterceptorManager extends InterceptorManager<
  RequestOptions,
  RequestInterceptor
> {
  /**
   * 执行请求拦截器链
   */
  async run(config: RequestOptions): Promise<RequestOptions> {
    let promise: Promise<RequestOptions> = Promise.resolve(config);

    this.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(
        fulfilled
          ? (value: RequestOptions): RequestOptions | Promise<RequestOptions> =>
              fulfilled(value)
          : (value: RequestOptions) => value,
        rejected
          ? (error: unknown): RequestOptions | Promise<RequestOptions> =>
              rejected(error)
          : undefined
      );
    });

    return promise;
  }
}

export class ResponseInterceptorManager extends InterceptorManager<
  Response,
  ResponseInterceptor
> {
  /**
   * 执行响应拦截器链
   */
  async run(response: Response): Promise<Response> {
    let promise: Promise<Response> = Promise.resolve(response);

    this.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(
        fulfilled
          ? (value: Response): Response | Promise<Response> => fulfilled(value)
          : (value: Response) => value,
        rejected
          ? (error: unknown): Response | Promise<Response> => rejected(error)
          : undefined
      );
    });

    return promise;
  }
}
