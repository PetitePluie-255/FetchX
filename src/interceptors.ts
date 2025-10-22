/**
 * FetchX 拦截器系统
 * 链式 add/remove、异步执行
 */

import type { RequestInterceptor, ResponseInterceptor } from './types';

export class InterceptorManager<T> {
  private interceptors: Array<{
    id: number;
    fulfilled?: T;
    rejected?: (_error: unknown) => unknown;
  }> = [];
  private nextId = 0;

  /**
   * 添加拦截器
   */
  use(fulfilled?: T, rejected?: (_error: unknown) => unknown): number {
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
      fulfilled?: T;
      rejected?: (_error: unknown) => unknown;
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

export class RequestInterceptorManager extends InterceptorManager<RequestInterceptor> {
  /**
   * 执行请求拦截器链
   */
  async run(config: unknown): Promise<unknown> {
    let promise = Promise.resolve(config);

    this.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(fulfilled, rejected);
    });

    return promise;
  }
}

export class ResponseInterceptorManager extends InterceptorManager<ResponseInterceptor> {
  /**
   * 执行响应拦截器链
   */
  async run(response: Response): Promise<Response> {
    let promise = Promise.resolve(response);

    this.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(fulfilled, rejected);
    });

    return promise;
  }
}
