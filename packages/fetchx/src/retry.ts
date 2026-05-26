import { FetchXError, type RetryConfig } from './types';

/**
 * Default retry condition: retry on network errors and server errors (5xx),
 * not on client errors (4xx) or cancellations.
 */
function defaultRetryCondition(error: FetchXError, _attempt: number): boolean {
  if (error.code === 'ERR_NETWORK') return true;
  if (error.code === 'ECONNABORTED') return true;
  if (error.code === 'ERR_BAD_RESPONSE') {
    // Retry on 5xx, not on 4xx
    return error.status !== undefined && error.status >= 500;
  }
  return false;
}

/**
 * Calculate exponential backoff delay: delay * 2^(attempt-1), capped at maxDelay
 */
function calcBackoff(attempt: number, delay: number, maxDelay: number): number {
  return Math.min(delay * Math.pow(2, attempt - 1), maxDelay);
}

const DEFAULT_RETRIES = 0;
const DEFAULT_DELAY = 1000;
const DEFAULT_MAX_DELAY = 30000;

/**
 * Execute a single fetch attempt within a retry loop.
 * `fn` is called for each attempt. On failure, if retry conditions are met,
 * waits for the backoff delay and retries.
 */
export async function executeWithRetry<T>(
  fn: (_attempt: number) => Promise<T>,
  retryConfig: RetryConfig | false | undefined,
  method: string
): Promise<T> {
  if (retryConfig === false || !retryConfig) {
    return fn(0);
  }

  const maxRetries = retryConfig.retries ?? DEFAULT_RETRIES;
  if (maxRetries <= 0) {
    return fn(0);
  }

  const delay = retryConfig.delay ?? DEFAULT_DELAY;
  const maxDelay = retryConfig.maxDelay ?? DEFAULT_MAX_DELAY;
  const methods = retryConfig.methods ?? ['GET', 'HEAD'];
  const condition = retryConfig.condition ?? defaultRetryCondition;

  // Only retry for configured HTTP methods
  if (!methods.includes(method.toUpperCase() as never)) {
    return fn(0);
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt - 1);
    } catch (error: unknown) {
      lastError = error;

      // Don't retry if condition says no
      if (error instanceof FetchXError && !condition(error, attempt)) {
        throw error;
      }

      // Last attempt — give up
      if (attempt > maxRetries) {
        throw error;
      }

      // Wait for backoff
      const backoff = calcBackoff(attempt, delay, maxDelay);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}
