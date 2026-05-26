import { describe, it, expect } from 'vitest';
import { executeWithRetry } from '../src/retry';
import { FetchXError } from '../src/types';

describe('executeWithRetry', () => {
  it('should call fn once when retry is disabled', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return 'ok';
    };

    const result = await executeWithRetry(fn, false, 'GET');
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('should call fn once when retries is 0', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return 'ok';
    };

    const result = await executeWithRetry(fn, { retries: 0 }, 'GET');
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('should retry on network errors', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 3) {
        throw new FetchXError('Network Error', undefined, 'ERR_NETWORK');
      }
      return 'ok';
    };

    const result = await executeWithRetry(fn, { retries: 5, delay: 10 }, 'GET');
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('should retry on 5xx errors', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 2) {
        throw new FetchXError(
          'Request failed with status 500',
          undefined,
          'ERR_BAD_RESPONSE',
          undefined,
          500
        );
      }
      return 'ok';
    };

    const result = await executeWithRetry(fn, { retries: 3, delay: 10 }, 'GET');
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('should NOT retry on 4xx errors', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new FetchXError(
        'Request failed with status 404',
        undefined,
        'ERR_BAD_RESPONSE',
        undefined,
        404
      );
    };

    await expect(
      executeWithRetry(fn, { retries: 3, delay: 10 }, 'GET')
    ).rejects.toThrow('Request failed with status 404');
    expect(calls).toBe(1);
  });

  it('should respect custom retry condition', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new FetchXError(
        'Request failed with status 429',
        undefined,
        'ERR_BAD_RESPONSE',
        undefined,
        429
      );
    };

    const attempts: number[] = [];
    const result = executeWithRetry(
      fn,
      {
        retries: 2,
        delay: 10,
        condition: (error, attempt) => {
          attempts.push(attempt);
          return error.status !== undefined && error.status === 429;
        },
      },
      'GET'
    );

    await expect(result).rejects.toThrow('429');
    // Called 3 times: initial + 2 retries
    expect(calls).toBe(3);
    expect(attempts).toEqual([1, 2, 3]);
  });

  it('should NOT retry on non-retryable methods by default', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new FetchXError('Network Error', undefined, 'ERR_NETWORK');
    };

    await expect(
      executeWithRetry(fn, { retries: 3, delay: 10 }, 'POST')
    ).rejects.toThrow('Network Error');
    // Only called once because POST is not retryable by default
    expect(calls).toBe(1);
  });

  it('should apply exponential backoff', async () => {
    const start = Date.now();
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 3) {
        throw new FetchXError('Network Error', undefined, 'ERR_NETWORK');
      }
      return 'ok';
    };

    const result = await executeWithRetry(fn, { retries: 5, delay: 50 }, 'GET');
    expect(result).toBe('ok');
    // 2 retries: 50ms + 100ms = 150ms minimum
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(140);
  });

  it('should cap backoff at maxDelay', async () => {
    const start = Date.now();
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new FetchXError('Network Error', undefined, 'ERR_NETWORK');
    };

    await expect(
      executeWithRetry(fn, { retries: 2, delay: 10000, maxDelay: 20 }, 'GET')
    ).rejects.toThrow('Network Error');

    // 2 retries → 3 total calls, each capped at ~20ms
    expect(calls).toBe(3);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
