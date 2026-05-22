import { describe, it, expect, vi } from 'vitest';
import { debounceRequest, throttleRequest } from '../src/debounce';

describe('debounceRequest', () => {
  it('should call the function after the delay', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const debounced = debounceRequest(fn, 50);

    const promise = debounced('arg1');
    await new Promise(r => setTimeout(r, 60));

    const result = await promise;
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('arg1');
  });

  it('should cancel previous calls when called again within delay', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const debounced = debounceRequest(fn, 50);

    const first = debounced('first');
    await new Promise(r => setTimeout(r, 10));
    const second = debounced('second');

    // First should be rejected
    await expect(first).rejects.toThrow('Debounced');
    // Second should succeed
    const result = await second;
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('should only execute the last call in a burst', async () => {
    const fn = vi.fn().mockResolvedValue('final');
    const debounced = debounceRequest(fn, 30);

    debounced('a').catch(() => {});
    debounced('b').catch(() => {});
    debounced('c').catch(() => {});
    const result = await debounced('d');

    expect(result).toBe('final');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('d');
  });

  it('should pass through the return type', async () => {
    const fn = async (x: number): Promise<{ value: number }> => ({
      value: x * 2,
    });
    const debounced = debounceRequest(fn, 20);

    const result = await debounced(5);
    expect(result).toEqual({ value: 10 });
  });
});

describe('throttleRequest', () => {
  it('should allow the first call immediately', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const throttled = throttleRequest(fn, 100);

    const result = await throttled('arg1');
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should ignore calls within the throttle interval', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const throttled = throttleRequest(fn, 50);

    const first = await throttled('first');
    expect(first).toBe('ok');

    const second = await throttled('second');
    expect(second).toBeUndefined();

    // Wait for throttle to clear
    await new Promise(r => setTimeout(r, 60));
    const third = await throttled('third');
    expect(third).toBe('ok');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should ignore multiple calls within the interval', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const throttled = throttleRequest(fn, 50);

    await throttled('a'); // allowed
    const r1 = await throttled('b'); // ignored
    const r2 = await throttled('c'); // ignored

    expect(r1).toBeUndefined();
    expect(r2).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
