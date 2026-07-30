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

function mockStream(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
    { status: 200 }
  );
}

describe('fetchx-logger', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('plugin structure', () => {
    it('should create a plugin with name "logger" and default priority', () => {
      const plugin = createLoggerPlugin();
      expect(plugin.name).toBe('logger');
      expect(plugin.priority).toBe(100);
      expect(typeof plugin.onRequest).toBe('function');
      expect(typeof plugin.onResponse).toBe('function');
      expect(typeof plugin.onError).toBe('function');
    });
  });

  describe('request logging', () => {
    it('should log outgoing requests with method and URL', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn }));

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/users');

      expect(logFn).toHaveBeenCalledWith('→ GET /users');
    });

    it('should not log requests when logRequest is false', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn, logRequest: false }));

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/test');

      expect(logFn).not.toHaveBeenCalledWith(expect.stringContaining('→'));
    });

    it('should support filterRequest', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(
        createLoggerPlugin({
          log: logFn,
          logResponse: false,
          filterRequest: (_, ctx) => ctx.url.includes('/include'),
        })
      );

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/exclude');
      expect(logFn).not.toHaveBeenCalled();

      await api.get('/include');
      expect(logFn).toHaveBeenCalledWith('→ GET /include');
    });
  });

  describe('response logging', () => {
    it('should log successful 2xx with ✓ and optional duration', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn }));

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/test');

      expect(logFn).toHaveBeenCalledWith(
        expect.stringMatching(
          /^✓ 200 https:\/\/example\.com\/test( \(\d+ms\))?$/u
        )
      );
    });

    it('should not log responses when logResponse is false', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn, logResponse: false }));

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/test');

      expect(logFn).not.toHaveBeenCalledWith(expect.stringContaining('✓'));
    });

    it('should support filterResponse', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(
        createLoggerPlugin({
          log: logFn,
          logRequest: false,
          filterResponse: (_, ctx) => ctx.url.includes('/include'),
        })
      );

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/exclude');
      expect(logFn).not.toHaveBeenCalled();

      await api.get('/include');
      expect(logFn).toHaveBeenCalledWith(expect.stringMatching(/^✓ 200/));
    });
  });

  describe('error logging', () => {
    it('should log HTTP errors (4xx/5xx) with code and message', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn }));

      fetchSpy.mockResolvedValue(mockJSON({ error: 'bad' }, 500));
      await expect(api.get('/fail')).rejects.toThrow();

      expect(logFn).toHaveBeenCalledWith(
        expect.stringMatching(
          /^✗ ERR_BAD_RESPONSE GET https:\/\/example\.com\/fail: .+/u
        )
      );
    });

    it('should include timing in error logs', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn }));

      fetchSpy.mockResolvedValue(mockJSON({ error: 'bad' }, 500));
      await expect(api.get('/fail')).rejects.toThrow();

      expect(logFn).toHaveBeenCalledWith(expect.stringMatching(/\(\d+ms\)$/u));
    });

    it('should not log errors when logError is false', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn, logError: false }));

      fetchSpy.mockResolvedValue(mockJSON({ error: 'bad' }, 500));
      await expect(api.get('/fail')).rejects.toThrow();

      expect(logFn).not.toHaveBeenCalledWith(expect.stringContaining('✗'));
    });
  });

  describe('stream logging', () => {
    it('should log stream completion with timing', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn }));
      fetchSpy.mockResolvedValue(mockStream(['data: value\n\n']));

      for await (const event of await api.sse('/chat')) {
        void event;
      }

      expect(logFn).toHaveBeenCalledWith(
        expect.stringMatching(/^✓ 200 \/chat \(\d+ms\)$/u)
      );
    });

    it('should log stream connection errors with timing', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn }));
      fetchSpy.mockRejectedValue(new TypeError('fetch failed'));

      await expect(api.sse('/chat')).rejects.toThrow('Network Error');

      expect(logFn).toHaveBeenCalledWith(
        expect.stringMatching(
          /^✗ ERR_NETWORK POST https:\/\/example\.com\/chat: Network Error \(\d+ms\)$/u
        )
      );
    });

    it('should log stream cancellation once', async () => {
      const logFn = vi.fn();
      const api = createFetchX();
      api.use(createLoggerPlugin({ log: logFn }));
      fetchSpy.mockResolvedValue(mockStream(['chunk']));

      const stream = await api.stream('/download');
      stream.abort();
      stream.abort();
      await Promise.resolve();

      expect(
        logFn.mock.calls.filter(([message]) =>
          String(message).includes('ERR_CANCELED')
        )
      ).toHaveLength(1);
    });

    it('should log stream parsing errors with timing', async () => {
      const logFn = vi.fn();
      const api = createFetchX();
      api.use(createLoggerPlugin({ log: logFn }));
      fetchSpy.mockResolvedValue(mockStream(['not-json\n']));

      await expect(async () => {
        for await (const entry of await api.ndjson('/logs')) {
          void entry;
        }
      }).rejects.toBeInstanceOf(SyntaxError);

      expect(logFn).toHaveBeenCalledWith(
        expect.stringMatching(/^✗ SyntaxError GET \/logs: .+ \(\d+ms\)$/u)
      );
    });
  });

  describe('timing', () => {
    it('should include duration when logTiming is true', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn, logTiming: true }));

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/test');

      expect(logFn).toHaveBeenCalledWith(
        expect.stringMatching(/^✓ 200 https:\/\/example\.com\/test \(\d+ms\)$/u)
      );
    });

    it('should omit duration when logTiming is false', async () => {
      const logFn = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: logFn, logTiming: false }));

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/test');

      expect(logFn).toHaveBeenCalledWith('✓ 200 https://example.com/test');
    });
  });

  describe('custom log function', () => {
    it('should use the custom log function', async () => {
      const customLog = vi.fn();
      const api = createFetchX({ baseURL: 'https://example.com' });
      api.use(createLoggerPlugin({ log: customLog }));

      fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
      await api.get('/test');

      expect(customLog).toHaveBeenCalled();
      expect(customLog.mock.calls[0][0]).toBe('→ GET /test');
    });
  });
});
