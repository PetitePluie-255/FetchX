import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchX } from '../src';
import type { Plugin } from '../src/types';

// Helper: mock a JSON response
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

describe('Plugin system', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ────────────────────────────────────────────
  //  Registration
  // ────────────────────────────────────────────

  it('should register a plugin and return an unregister function', () => {
    const api = createFetchX();
    const plugin: Plugin = { name: 'test' };
    const unsub = api.use(plugin);
    expect(typeof unsub).toBe('function');
  });

  it('should throw when registering a duplicate plugin name', () => {
    const api = createFetchX();
    const plugin: Plugin = { name: 'dup' };
    api.use(plugin);
    expect(() => api.use({ name: 'dup' })).toThrow('already registered');
  });

  it('should unregister a plugin by name', () => {
    const api = createFetchX();
    const plugin: Plugin = { name: 'test' };
    api.use(plugin);
    expect(api.unuse('test')).toBe(true);
    // Second unuse returns false
    expect(api.unuse('test')).toBe(false);
  });

  it('should unregister via returned function', () => {
    const api = createFetchX();
    const fn = vi.fn();
    const plugin: Plugin = {
      name: 'test',
      onRequest: config => {
        fn();
        return config;
      },
    };
    const unsub = api.use(plugin);
    unsub();

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    return api.get('/test').then(() => {
      expect(fn).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────
  //  onInit
  // ────────────────────────────────────────────

  it('should call onInit when plugin is registered', () => {
    const initFn = vi.fn();
    const api = createFetchX();
    const plugin: Plugin = {
      name: 'init-test',
      onInit: initFn,
    };
    api.use(plugin);
    expect(initFn).toHaveBeenCalledTimes(1);
    expect(initFn).toHaveBeenCalledWith(api);
  });

  it('should remove plugin when onInit throws synchronously', () => {
    const api = createFetchX();
    expect(() => {
      api.use({
        name: 'bad-init',
        onInit: () => {
          throw new Error('init failed');
        },
      });
    }).toThrow('onInit failed');

    // Plugin should not be registered
    expect(api.unuse('bad-init')).toBe(false);
  });

  // ────────────────────────────────────────────
  //  onRequest
  // ────────────────────────────────────────────

  it('should allow onRequest to modify request config', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });
    api.use({
      name: 'add-header',
      onRequest: config => ({
        ...config,
        headers: { ...config.headers, 'X-Plugin': 'yes' },
      }),
    });

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));

    await api.get('/test');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('X-Plugin')).toBe('yes');
  });

  it('should call onRequest in priority order', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });
    const order: number[] = [];

    api.use({
      name: 'first',
      priority: 1,
      onRequest: config => {
        order.push(1);
        return config;
      },
    });

    api.use({
      name: 'second',
      priority: 2,
      onRequest: config => {
        order.push(2);
        return config;
      },
    });

    api.use({
      name: 'third',
      priority: 0,
      onRequest: config => {
        order.push(0);
        return config;
      },
    });

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    await api.get('/test');
    expect(order).toEqual([0, 1, 2]);
  });

  it('should pass previous onRequest result to next plugin', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });

    api.use({
      name: 'step1',
      priority: 1,
      onRequest: config => ({
        ...config,
        headers: { ...config.headers, 'X-Step': '1' },
      }),
    });

    api.use({
      name: 'step2',
      priority: 2,
      onRequest: config => ({
        ...config,
        headers: { ...config.headers, 'X-Step2': 'yes' },
      }),
    });

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    await api.get('/test');

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('X-Step')).toBe('1');
    expect(headers.get('X-Step2')).toBe('yes');
  });

  // ────────────────────────────────────────────
  //  onResponse
  // ────────────────────────────────────────────

  it('should allow onResponse to modify response data', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });

    api.use({
      name: 'wrap-data',
      onResponse: response => ({
        ...response,
        data: { wrapped: response.data },
      }),
    });

    fetchSpy.mockResolvedValue(mockJSON({ value: 42 }));
    const result = await api.get<{ value: number }>('/test');

    expect(result.data).toEqual({ wrapped: { value: 42 } });
  });

  it('should chain onResponse hooks in priority order', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });

    api.use({
      name: 'add-a',
      priority: 1,
      onResponse: res => ({
        ...res,
        data: { ...(res.data as object), a: 1 },
      }),
    });

    api.use({
      name: 'add-b',
      priority: 2,
      onResponse: res => ({
        ...res,
        data: { ...(res.data as object), b: 2 },
      }),
    });

    fetchSpy.mockResolvedValue(mockJSON({}));
    const result = await api.get('/test');

    expect(result.data).toEqual({ a: 1, b: 2 });
  });

  // ────────────────────────────────────────────
  //  onError
  // ────────────────────────────────────────────

  it('should recover from error when onError returns a response', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });

    api.use({
      name: 'error-recovery',
      onError: error => {
        if (error.code === 'ERR_BAD_RESPONSE') {
          return {
            data: { fallback: true },
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            config: error.config ?? {},
          };
        }
        return undefined;
      },
    });

    fetchSpy.mockResolvedValue(mockJSON({}, 500));
    const result = await api.get('/test');

    expect(result.data).toEqual({ fallback: true });
    expect(result.status).toBe(200);
  });

  it('should let errors propagate when onError returns undefined', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });

    api.use({
      name: 'passthrough',
      onError: () => undefined,
    });

    fetchSpy.mockResolvedValue(mockJSON({}, 500));

    await expect(api.get('/test')).rejects.toThrow();
  });

  it('should propagate original error when no onError plugin', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });
    fetchSpy.mockResolvedValue(mockJSON({}, 500));

    await expect(api.get('/test')).rejects.toThrow(/failed with status 500/);
  });

  // ────────────────────────────────────────────
  //  Per-request plugins
  // ────────────────────────────────────────────

  it('should support per-request plugins', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });
    const perRequestFn = vi.fn();

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    await api.get('/test', {
      plugins: [
        {
          name: 'per-request',
          onRequest: config => {
            perRequestFn();
            return config;
          },
        },
      ],
    });

    expect(perRequestFn).toHaveBeenCalledTimes(1);
  });

  it('should run per-request plugins alongside global plugins', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });
    const globalFn = vi.fn();
    const perRequestFn = vi.fn();

    api.use({
      name: 'global',
      onRequest: config => {
        globalFn();
        return config;
      },
    });

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    await api.get('/test', {
      plugins: [
        {
          name: 'per-request',
          onRequest: config => {
            perRequestFn();
            return config;
          },
        },
      ],
    });

    expect(globalFn).toHaveBeenCalledTimes(1);
    expect(perRequestFn).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────
  //  Multiple plugins on different hooks
  // ────────────────────────────────────────────

  it('should run all hook types on a single request', async () => {
    const api = createFetchX({ baseURL: 'https://example.com' });
    const events: string[] = [];

    api.use({
      name: 'logger',
      priority: 1,
      onRequest: config => {
        events.push('onRequest');
        return { ...config, headers: { ...config.headers, 'X-Trace': '1' } };
      },
      onResponse: res => {
        events.push('onResponse');
        return { ...res, data: { ...(res.data as object), traced: true } };
      },
    });

    fetchSpy.mockResolvedValue(mockJSON({ ok: true }));
    const result = await api.get('/test');

    expect(events).toEqual(['onRequest', 'onResponse']);
    expect(result.data).toEqual({ ok: true, traced: true });
  });

  // ────────────────────────────────────────────
  //  FetchXInstance satisfies Plugin interface
  // ────────────────────────────────────────────

  it('should expose use/unuse on the instance', () => {
    const api = createFetchX();
    expect(typeof api.use).toBe('function');
    expect(typeof api.unuse).toBe('function');
  });
});
