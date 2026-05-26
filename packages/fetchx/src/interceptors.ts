import type { RequestOptions } from './types';

interface InterceptorEntry<T> {
  id: number;
  name?: string;
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
   * Add a named interceptor. Returns an unregister function.
   *
   * ```ts
   * const unsub = interceptors.use('log', config => config);
   * unsub(); // removes it
   * ```
   */
  use(
    _name: string,
    _fulfilled?: (_value: T) => T | Promise<T>,
    _rejected?: (_error: unknown) => T | Promise<T>
  ): () => void;

  /**
   * Add an anonymous interceptor. Returns a numeric ID for eject().
   *
   * ```ts
   * const id = interceptors.use(config => config);
   * interceptors.eject(id);
   * ```
   */
  use(
    _fulfilled?: (_value: T) => T | Promise<T>,
    _rejected?: (_error: unknown) => T | Promise<T>
  ): number;

  use(
    nameOrFulfilled?: string | ((_value: T) => T | Promise<T>),
    rejectedOrFulfilled?:
      | ((_error: unknown) => T | Promise<T>)
      | ((_value: T) => T | Promise<T>),
    maybeRejected?: (_error: unknown) => T | Promise<T>
  ): number | (() => void) {
    if (typeof nameOrFulfilled === 'string') {
      // Named interceptor: use(name, fulfilled?, rejected?)
      const name = nameOrFulfilled;
      const fulfilled = rejectedOrFulfilled;
      const rejected = maybeRejected;
      const id = this.nextId++;
      this.entries.push({ id, name, fulfilled, rejected });
      return () => this.remove(name);
    }

    // Anonymous interceptor: use(fulfilled?, rejected?)
    const fulfilled = nameOrFulfilled;
    const rejected = rejectedOrFulfilled as
      | ((_error: unknown) => T | Promise<T>)
      | undefined;
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
   * Remove an interceptor by name. Returns true if found and removed.
   */
  remove(name: string): boolean {
    const index = this.entries.findIndex(_entry => _entry.name === name);
    if (index !== -1) {
      this.entries.splice(index, 1);
      return true;
    }
    return false;
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
