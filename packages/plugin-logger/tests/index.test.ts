import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchX } from '@petite-pluie/fetchx';
import { createLoggerPlugin } from '../src';

function mockJSON(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
) {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('fetchx-logger', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should create a plugin with the name "logger"', () => {
    const plugin = createLoggerPlugin();
    expect(plugin.name).toBe('logger');
    expect(plugin.priority).toBe(100);
    expect(typeof plugin.onRequest).toBe('function');
    expect(typeof plugin.onResponse).toBe('function');
    expect(typeof plugin.onError).toBe('function');
  });

  it('should log request and response by default', async () => {
    const logFn = vi.fn();
    const api = createFetchX({ baseURL: 'https://example.com' });
    api.use(createLoggerPlugin({ log: logFn }));

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    await api.get('/test');

    // onRequest receives the raw URL (before baseURL resolution),
    // onResponse receives the full URL
    expect(logFn).toHaveBeenCalledWith('[→ GET] /test');
    expect(logFn).toHaveBeenCalledWith('[← 200] https://example.com/test');
  });

  it('should log errors when they occur', async () => {
    const logFn = vi.fn();
    const api = createFetchX({ baseURL: 'https://example.com' });
    api.use(createLoggerPlugin({ log: logFn }));

    fetchSpy.mockResolvedValue(mockJSON({ error: 'bad' }, 500));
    await expect(api.get('/test')).rejects.toThrow();

    expect(logFn).toHaveBeenCalledWith(
      expect.stringContaining('ERR_BAD_RESPONSE')
    );
  });

  it('should allow disabling request logging', async () => {
    const logFn = vi.fn();
    const api = createFetchX({ baseURL: 'https://example.com' });
    api.use(createLoggerPlugin({ log: logFn, logRequest: false }));

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    await api.get('/test');

    expect(logFn).not.toHaveBeenCalledWith(expect.stringContaining('[→ GET]'));
    expect(logFn).toHaveBeenCalledWith('[← 200] https://example.com/test');
  });

  it('should support filterRequest', async () => {
    const logFn = vi.fn();
    const api = createFetchX({ baseURL: 'https://example.com' });
    api.use(
      createLoggerPlugin({
        log: logFn,
        logResponse: false, // isolate request logging
        filterRequest: (_, ctx) => ctx.url.includes('/include'),
      })
    );

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    await api.get('/exclude');
    expect(logFn).not.toHaveBeenCalled();

    await api.get('/include');
    expect(logFn).toHaveBeenCalledWith('[→ GET] /include');
  });

  it('should work with custom log function', async () => {
    const customLog = vi.fn();
    const api = createFetchX({ baseURL: 'https://example.com' });
    api.use(createLoggerPlugin({ log: customLog }));

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    await api.get('/test');

    expect(customLog).toHaveBeenCalled();
    expect(customLog.mock.calls[0][0]).toContain('[→ GET]');
  });
});
