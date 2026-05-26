import { describe, it, expect } from 'vitest';
import { ConcurrencyManager } from '../src/concurrency';

describe('ConcurrencyManager', () => {
  it('should allow unlimited concurrency when max is 0', async () => {
    const cm = new ConcurrencyManager(0);
    await cm.acquire();
    await cm.acquire();
    await cm.acquire();
    // Should not block
    cm.release();
    cm.release();
    cm.release();
  });

  it('should allow up to maxConcurrency concurrent acquires', async () => {
    const cm = new ConcurrencyManager(2);

    // First two should succeed immediately
    await cm.acquire();
    await cm.acquire();

    // Third should queue
    let resolved = false;
    const promise = cm.acquire().then(() => {
      resolved = true;
    });

    // Give time for the queued acquire to check
    await new Promise(r => setTimeout(r, 10));
    expect(resolved).toBe(false);

    // Release one, third should proceed
    cm.release();
    await promise;
    expect(resolved).toBe(true);

    cm.release();
    cm.release();
  });

  it('should release queued callers in FIFO order', async () => {
    const cm = new ConcurrencyManager(1);
    const order: number[] = [];

    await cm.acquire(); // take the slot

    const p1 = cm.acquire().then(() => {
      order.push(1);
    });
    const p2 = cm.acquire().then(() => {
      order.push(2);
    });
    const p3 = cm.acquire().then(() => {
      order.push(3);
    });

    await new Promise(r => setTimeout(r, 10));
    expect(order).toEqual([]);

    cm.release(); // p1 proceeds
    await p1;
    expect(order).toEqual([1]);

    cm.release(); // p2 proceeds
    await p2;
    expect(order).toEqual([1, 2]);

    cm.release(); // p3 proceeds
    await p3;
    expect(order).toEqual([1, 2, 3]);
  });

  it('should drain queue and reject all pending', async () => {
    const cm = new ConcurrencyManager(1);
    await cm.acquire(); // take the slot

    let error: unknown;
    const p1 = cm.acquire().catch(e => {
      error = e;
    });

    await new Promise(r => setTimeout(r, 10));
    cm.drain('shutdown');

    await p1;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('shutdown');
  });
});
