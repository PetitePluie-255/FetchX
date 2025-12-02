import { describe, it, expect } from 'vitest';

describe('Environment Debug', () => {
  it('should have standard AbortController', () => {
    const controller = new AbortController();
    const signal = controller.signal;
    console.log('Signal:', signal);
    console.log('Signal prototype:', Object.getPrototypeOf(signal));
    console.log('Has addEventListener:', typeof signal.addEventListener);
    expect(typeof signal.addEventListener).toBe('function');
  });
});
