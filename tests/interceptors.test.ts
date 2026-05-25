import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchX } from '../src/FetchX';
import { FetchXError } from '../src/types';

const mockFetch = vi.fn();

describe('Interceptors', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('request interceptors', () => {
    it('should execute request interceptors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ data: 'test' }),
      });

      const api = createFetchX();
      const interceptor = vi.fn(config => config);

      api.interceptors.request.use(interceptor);
      await api.get('/test');

      expect(interceptor).toHaveBeenCalledTimes(1);
    });

    it('should modify request config in interceptor', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX({ baseURL: 'https://api.example.com' });

      api.interceptors.request.use(config => ({
        ...config,
        headers: { ...config.headers, 'X-Custom': 'value' },
      }));

      await api.get('/test');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const fetchHeaders = callArgs[1].headers as Headers;
      expect(fetchHeaders.get('x-custom')).toBe('value');
    });

    it('should execute multiple request interceptors in order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX();
      const order: number[] = [];

      api.interceptors.request.use(config => {
        order.push(1);
        return config;
      });
      api.interceptors.request.use(config => {
        order.push(2);
        return config;
      });

      await api.get('/test');
      expect(order).toEqual([1, 2]);
    });

    it('should support async request interceptors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX();

      api.interceptors.request.use(async config => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { ...config, headers: { ...config.headers, 'X-Async': 'true' } };
      });

      await api.get('/test');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const fetchHeaders = callArgs[1].headers as Headers;
      expect(fetchHeaders.get('x-async')).toBe('true');
    });
  });

  describe('response interceptors', () => {
    it('should execute response interceptors', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ data: 'test' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const api = createFetchX();
      const interceptor = vi.fn(response => response);

      api.interceptors.response.use(interceptor);
      await api.get('/test');

      expect(interceptor).toHaveBeenCalledWith(mockResponse);
    });

    it('should modify response in interceptor', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX();

      api.interceptors.response.use(() => {
        // Return a modified Response
        return new Response(JSON.stringify({ intercepted: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

      const result = await api.get('/test');
      expect(result.data).toEqual({ intercepted: true });
    });

    it('should execute multiple response interceptors in order', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const api = createFetchX();
      const order: number[] = [];

      api.interceptors.response.use(response => {
        order.push(1);
        return response;
      });
      api.interceptors.response.use(response => {
        order.push(2);
        return response;
      });

      await api.get('/test');
      expect(order).toEqual([1, 2]);
    });
  });

  describe('response error interceptors', () => {
    it('should call rejected handler on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      const api = createFetchX();
      const onRejected = vi.fn((_error: unknown) => {
        throw _error;
      });

      api.interceptors.response.use(response => response, onRejected);

      try {
        await api.get('/not-found');
      } catch {
        // expected
      }

      expect(onRejected).toHaveBeenCalledTimes(1);
      const error = onRejected.mock.calls[0]?.[0] as FetchXError;
      expect(error).toBeInstanceOf(FetchXError);
      expect(error.code).toBe('ERR_BAD_RESPONSE');
    });

    it('should allow rejected handler to recover by returning a Response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
      });

      const api = createFetchX();

      api.interceptors.response.use(
        response => response,
        () =>
          // Recover by returning a synthetic success Response
          new Response(JSON.stringify({ retried: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
      );

      const result = await api.get('/protected');
      expect(result.data).toEqual({ retried: true });
    });

    it('should re-throw error from rejected handler', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      const api = createFetchX();
      const customError = new Error('Boom');

      api.interceptors.response.use(
        response => response,
        () => {
          throw customError;
        }
      );

      await expect(api.get('/error')).rejects.toThrow('Boom');
    });

    it('should support mixed fulfilled/rejected chain with recovery', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ error: 'forbidden' }),
      });

      const api = createFetchX();
      const order: string[] = [];

      // First: rejected handler catches and recovers
      api.interceptors.response.use(
        response => {
          order.push('fulfilled-1');
          return response;
        },
        _error => {
          order.push('rejected-1');
          // Recover with a good response
          return new Response(JSON.stringify({ recovered: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
      );

      // Second: fulfilled handler sees the recovered response
      api.interceptors.response.use(response => {
        order.push('fulfilled-2');
        return response;
      });

      const result = await api.get('/forbidden');
      expect(result.data).toEqual({ recovered: true });
      expect(order).toEqual(['rejected-1', 'fulfilled-2']);
    });

    it('should propagate error when no rejected handler is registered', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        headers: new Headers(),
      });

      const api = createFetchX();

      // fulfilled-only handler — no rejected handler
      api.interceptors.response.use(response => response);

      await expect(api.get('/gateway')).rejects.toThrow('502');
    });
  });

  describe('interceptor management', () => {
    it('should support ejecting interceptors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX();
      const interceptor = vi.fn(config => config);
      const id = api.interceptors.request.use(interceptor);

      api.interceptors.request.eject(id);
      await api.get('/test');

      expect(interceptor).not.toHaveBeenCalled();
    });

    it('should support ejecting response interceptors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX();
      const interceptor = vi.fn(response => response);
      const id = api.interceptors.response.use(interceptor);

      api.interceptors.response.eject(id);
      await api.get('/test');

      expect(interceptor).not.toHaveBeenCalled();
    });

    it('should support clearing all interceptors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX();
      const interceptor1 = vi.fn(config => config);
      const interceptor2 = vi.fn(config => config);

      api.interceptors.request.use(interceptor1);
      api.interceptors.request.use(interceptor2);
      api.interceptors.request.clear();

      await api.get('/test');
      expect(interceptor1).not.toHaveBeenCalled();
      expect(interceptor2).not.toHaveBeenCalled();
    });

    it('should expose interceptor count via length', () => {
      const api = createFetchX();
      expect(api.interceptors.request.length).toBe(0);

      api.interceptors.request.use(vi.fn(config => config));
      expect(api.interceptors.request.length).toBe(1);

      api.interceptors.request.use(vi.fn(config => config));
      expect(api.interceptors.request.length).toBe(2);
    });
  });

  describe('rejection handling', () => {
    it('should handle interceptor rejection recovery', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ fallback: true }),
      });

      const api = createFetchX();

      // First interceptor throws, second interceptor's rejection handler catches
      api.interceptors.request.use(() => {
        throw new Error('Interceptor error');
      });
      api.interceptors.request.use(
        () => ({ url: '/ignored', method: 'GET' }),
        () => ({
          url: '/fallback',
          method: 'GET',
        })
      );

      await api.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        '/fallback',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });
});
