/**
 * Promise-based concurrency limiter (semaphore pattern).
 * Limits the number of simultaneously in-flight requests.
 */
export class ConcurrencyManager {
  private inFlight = 0;
  private queue: Array<{
    resolve: () => void;
    reject: (_reason?: unknown) => void;
  }> = [];
  private maxConcurrency: number;

  constructor(maxConcurrency = 0) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Acquire a concurrency slot. Resolves immediately if a slot is available,
   * otherwise queues the caller until a slot is freed.
   */
  async acquire(): Promise<void> {
    if (this.maxConcurrency <= 0) {
      // Unlimited
      return;
    }

    if (this.inFlight < this.maxConcurrency) {
      this.inFlight++;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  /**
   * Release a concurrency slot, allowing the next queued caller to proceed.
   */
  release(): void {
    if (this.maxConcurrency <= 0) {
      return;
    }

    const next = this.queue.shift();
    if (next) {
      next.resolve();
    } else {
      this.inFlight--;
    }
  }

  /**
   * Reject all queued requests (e.g., on instance destruction).
   */
  drain(reason?: string): void {
    let entry;
    while ((entry = this.queue.shift())) {
      entry.reject(new Error(reason ?? 'Concurrency queue drained'));
    }
    this.inFlight = 0;
  }
}
