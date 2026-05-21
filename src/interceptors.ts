import type { RequestOptions } from './types';

interface InterceptorEntry<T> {
  id: number;
  fulfilled?: (_value: T) => T | Promise<T>;
  rejected?: (_error: unknown) => T | Promise<T>;
}

/**
 * Generic interceptor manager
 */
export class InterceptorManager<T> {
  private entries: Array<InterceptorEntry<T>> = [];
  private nextId = 0;

  /**
   * Add an interceptor. Returns an ID that can be used to eject it.
   */
  use(
    fulfilled?: (_value: T) => T | Promise<T>,
    rejected?: (_error: unknown) => T | Promise<T>
  ): number {
    const id = this.nextId++;
    this.entries.push({ id, fulfilled, rejected });
    return id;
  }

  /**
   * Remove an interceptor by its ID
   */
  eject(id: number): void {
    const index = this.entries.findIndex(_entry => _entry.id === id);
    if (index !== -1) {
      this.entries.splice(index, 1);
    }
  }

  /**
   * Remove all interceptors
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Iterate over all interceptors
   */
  forEach(fn: (_entry: InterceptorEntry<T>) => void): void {
    this.entries.forEach(fn);
  }

  /**
   * Number of active interceptors
   */
  get length(): number {
    return this.entries.length;
  }
}

/**
 * Request interceptor manager
 */
export class RequestInterceptorManager extends InterceptorManager<RequestOptions> {
  /**
   * Execute the request interceptor chain
   */
  run(config: RequestOptions): Promise<RequestOptions> {
    let promise: Promise<RequestOptions> = Promise.resolve(config);

    this.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(fulfilled, rejected);
    });

    return promise;
  }
}

/**
 * Response interceptor manager
 */
export class ResponseInterceptorManager extends InterceptorManager<Response> {
  /**
   * Execute the response interceptor chain
   */
  run(promise: Promise<Response>): Promise<Response> {
    this.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(fulfilled, rejected);
    });

    return promise;
  }
}
