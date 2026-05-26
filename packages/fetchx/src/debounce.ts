/**
 * Debounce and throttle utilities for request functions.
 * These are standalone wrappers — they work with any async function,
 * not just FetchX request methods.
 */

/**
 * Creates a debounced version of an async function.
 * Subsequent calls within `delay` ms cancel previous calls.
 * The returned function resolves to `undefined` when debounced.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounceRequest<F extends (..._args: any[]) => Promise<any>>(
  fn: F,
  delay: number
): (..._args: Parameters<F>) => Promise<Awaited<ReturnType<F>> | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastReject: ((_reason?: unknown) => void) | undefined;

  return (...args: Parameters<F>) => {
    return new Promise<Awaited<ReturnType<F>> | undefined>(
      (resolve, reject) => {
        // Cancel previous pending call
        if (lastReject) {
          lastReject(new Error('Debounced: superseded by newer call'));
        }
        if (timer) {
          clearTimeout(timer);
        }

        lastReject = reject;

        timer = setTimeout(() => {
          lastReject = undefined;
          timer = undefined;
          fn(...args).then(resolve, reject);
        }, delay);
      }
    );
  };
}

/**
 * Creates a throttled version of an async function.
 * Calls within `interval` ms are ignored (resolve to `undefined`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttleRequest<F extends (..._args: any[]) => Promise<any>>(
  fn: F,
  interval: number
): (..._args: Parameters<F>) => Promise<Awaited<ReturnType<F>> | undefined> {
  let isThrottled = false;

  return (...args: Parameters<F>) => {
    if (isThrottled) {
      return Promise.resolve(undefined) as Promise<
        Awaited<ReturnType<F>> | undefined
      >;
    }

    isThrottled = true;
    setTimeout(() => {
      isThrottled = false;
    }, interval);

    return fn(...args);
  };
}
