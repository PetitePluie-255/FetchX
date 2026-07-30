import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchX } from '../src/FetchX';
import {
  FetchXError,
  CancelError,
  HTTPError,
  NetworkError,
  type TimeoutError,
} from '../src/types';
import { FetchXStream } from '../src/stream';

// Helper: create a ReadableStream<Uint8Array> for mock fetch responses
function mockStreamBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

const mockFetch = vi.fn();

describe('FetchX', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const api = createFetchX();
      expect(api).toBeDefined();
      expect(api.get).toBeInstanceOf(Function);
      expect(api.post).toBeInstanceOf(Function);
      expect(api.interceptors).toBeDefined();
      expect(api.interceptors.request).toBeDefined();
      expect(api.interceptors.response).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const api = createFetchX({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: { Authorization: 'Bearer token' },
      });
      expect(api).toBeDefined();
    });
  });

  describe('requestExecutor', () => {
    it('should use an instance-level executor for regular requests', async () => {
      const controller = new AbortController();
      const executor = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ source: 'custom' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
      const api = createFetchX({ requestExecutor: executor });

      const result = await api.get('/custom', {
        signal: controller.signal,
      });

      expect(result.data).toEqual({ source: 'custom' });
      expect(executor).toHaveBeenCalledWith(
        '/custom',
        expect.objectContaining({
          method: 'GET',
          signal: controller.signal,
        })
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should allow a request-level executor to override the instance', async () => {
      const instanceExecutor = vi.fn();
      const requestExecutor = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ source: 'request' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
      const api = createFetchX({ requestExecutor: instanceExecutor });

      const result = await api.get('/override', { requestExecutor });

      expect(result.data).toEqual({ source: 'request' });
      expect(requestExecutor).toHaveBeenCalledOnce();
      expect(instanceExecutor).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use the configured executor for streaming requests', async () => {
      const executor = vi.fn().mockResolvedValue(
        new Response(mockStreamBody(['data: custom\n\n']), {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        })
      );
      const api = createFetchX({ requestExecutor: executor });

      const stream = await api.sse('/stream');
      const events: Array<{ data: string }> = [];
      for await (const event of stream) {
        events.push(event);
      }

      expect(events).toEqual([{ data: 'custom' }]);
      expect(executor).toHaveBeenCalledWith(
        '/stream',
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal),
        })
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should map executor failures through the existing error pipeline', async () => {
      const executor = vi
        .fn()
        .mockRejectedValue(new TypeError('Failed to fetch'));
      const api = createFetchX({ requestExecutor: executor });

      await expect(api.get('/failure')).rejects.toBeInstanceOf(NetworkError);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('should make a GET request and return data', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData),
      });

      const api = createFetchX();
      const result = await api.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      );
      expect(result.data).toEqual(mockData);
    });

    it('should support query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });

      const api = createFetchX();
      await api.get('/users', { params: { page: '1', limit: '10' } });

      expect(mockFetch).toHaveBeenCalledWith(
        '/users?page=1&limit=10',
        expect.any(Object)
      );
    });
  });

  describe('POST', () => {
    it('should make a POST request with JSON body', async () => {
      const postBody = { name: 'New User' };
      const mockResponse = { id: 1, ...postBody };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse),
      });

      const api = createFetchX();
      const result = await api.post('/users', postBody);

      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postBody),
        })
      );
      expect(result.data).toEqual(mockResponse);
    });

    it('should support FormData body and not set Content-Type', async () => {
      const formData = new FormData();
      formData.append('name', 'Test');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX();
      await api.post('/upload', formData);

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const reqHeaders = callArgs[1].headers as Headers;

      expect(mockFetch).toHaveBeenCalledWith(
        '/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
      // B1: Content-Type must NOT be set for FormData bodies
      expect(reqHeaders.get('content-type')).toBeNull();
    });
  });

  describe('PUT', () => {
    it('should make a PUT request', async () => {
      const putBody = { name: 'Updated' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(putBody),
      });

      const api = createFetchX();
      const result = await api.put('/users/1', putBody);

      expect(mockFetch).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putBody),
        })
      );
      expect(result.data).toEqual(putBody);
    });
  });

  describe('DELETE', () => {
    it('should make a DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: () => Promise.resolve(null),
        blob: () => Promise.resolve(new Blob()),
      });

      const api = createFetchX();
      await api.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('PATCH', () => {
    it('should make a PATCH request', async () => {
      const patchBody = { name: 'Patched' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(patchBody),
      });

      const api = createFetchX();
      const result = await api.patch('/users/1', patchBody);

      expect(mockFetch).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchBody),
        })
      );
      expect(result.data).toEqual(patchBody);
    });
  });

  describe('HEAD', () => {
    it('should make a HEAD request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        blob: () => Promise.resolve(new Blob()),
      });

      const api = createFetchX();
      await api.head('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ method: 'HEAD' })
      );
    });
  });

  describe('baseURL', () => {
    it('should prepend baseURL to requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX({ baseURL: 'https://api.example.com' });
      await api.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.any(Object)
      );
    });
  });

  describe('timeout', () => {
    it('should reject with timeout error', async () => {
      const api = createFetchX({ timeout: 50 });

      mockFetch.mockImplementationOnce(
        (_url: string, _options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            if (_options?.signal) {
              _options.signal.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          })
      );

      await expect(api.get('/slow')).rejects.toThrow('Request timeout');
    }, 10000);

    it('should cancel timeout timer on successful response', async () => {
      const api = createFetchX({ timeout: 5000 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ data: 'ok' }),
      });

      const result = await api.get('/fast');
      expect(result.data).toEqual({ data: 'ok' });
    });
  });

  describe('cancel', () => {
    it('should reject when user signal is aborted before request', async () => {
      const controller = new AbortController();
      controller.abort();

      const api = createFetchX();

      await expect(
        api.get('/test', { signal: controller.signal })
      ).rejects.toThrow('Request canceled');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject when user signal is aborted during request', async () => {
      const controller = new AbortController();
      const api = createFetchX();

      mockFetch.mockImplementationOnce(
        (_url: string, _options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            if (_options?.signal) {
              _options.signal.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          })
      );

      const promise = api.get('/test', { signal: controller.signal });
      await new Promise(resolve => setTimeout(resolve, 10));
      controller.abort();

      await expect(promise).rejects.toThrow('Request canceled');
    });

    it('should classify a custom abort reason as CancelError', async () => {
      const controller = new AbortController();
      const api = createFetchX();

      mockFetch.mockImplementationOnce(
        (_url: string, options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason),
              { once: true }
            );
          })
      );

      const pending = api.get('/test', { signal: controller.signal });
      await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());
      controller.abort(new Error('user stop'));

      await expect(pending).rejects.toBeInstanceOf(CancelError);
    });
  });

  describe('error handling', () => {
    it('should throw FetchXError on non-2xx status', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 404,
          statusText: 'Not Found',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );

      const api = createFetchX({
        sanitizeConfig: true,
        headers: {
          Authorization: 'Bearer secret',
          'x-request-id': 'safe',
        },
      });
      try {
        await api.get('/not-found');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchXError);
        const fetchXError = error as FetchXError;
        expect(fetchXError.message).toContain('404');
        expect(fetchXError.code).toBe('ERR_BAD_RESPONSE');
        expect(fetchXError.isAxiosError).toBe(true);
        expect(fetchXError.config?.headers).toEqual({
          'x-request-id': 'safe',
        });
      }
    });

    it('should throw FetchXError on network error', async () => {
      mockFetch.mockRejectedValueOnce(
        Object.assign(new TypeError('Failed to fetch'), {
          message: 'Failed to fetch',
        })
      );

      const api = createFetchX();
      try {
        await api.get('/network-error');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchXError);
        const fetchXError = error as FetchXError;
        expect(fetchXError.code).toBe('ERR_NETWORK');
        expect(fetchXError.message).toBe('Network Error');
      }
    });

    it('should pass through non-FetchX errors', async () => {
      const customError = new Error('Something else');
      mockFetch.mockRejectedValueOnce(customError);

      const api = createFetchX();
      await expect(api.get('/test')).rejects.toThrow('Something else');
    });
  });

  describe('config sanitization', () => {
    it('should strip sensitive headers from config when sanitizeConfig is enabled', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );

      const api = createFetchX({
        sanitizeConfig: true,
        headers: { Authorization: 'Bearer secret', 'X-Custom': 'visible' },
      });

      const result = await api.get('/test');
      expect(
        (result.config.headers as Record<string, string>).Authorization
      ).toBeUndefined();
      expect(
        (result.config.headers as Record<string, string>)['X-Custom']
      ).toBe('visible');
    });

    it('should keep sensitive headers when sanitizeConfig is off', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );

      const api = createFetchX({
        headers: { Authorization: 'Bearer secret' },
      });

      const result = await api.get('/test');
      expect(
        (result.config.headers as Record<string, string>).Authorization
      ).toBe('Bearer secret');
    });
  });

  describe('paramsSerializer', () => {
    it('should use custom paramsSerializer when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });

      const api = createFetchX();
      await api.get('/users', {
        params: { name: 'test' },
        paramsSerializer: () => 'custom=param',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/users?custom=param',
        expect.any(Object)
      );
    });
  });

  describe('response types', () => {
    it('should handle text response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('plain text'),
      });

      const api = createFetchX();
      const result = await api.get('/text');
      expect(result.data).toBe('plain text');
    });

    it('should handle blob response', async () => {
      const blob = new Blob(['test']);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({}),
        blob: () => Promise.resolve(blob),
      });

      const api = createFetchX();
      const result = await api.get('/blob');
      expect(result.data).toBe(blob);
    });
  });

  describe('validateStatus', () => {
    it('should treat 4xx as success with custom validateStatus', async () => {
      const notFoundData = { error: 'not found' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(notFoundData),
      });

      const api = createFetchX({
        validateStatus: (status: number) => status < 500,
      });
      const result = await api.get('/not-found');
      expect(result.data).toEqual(notFoundData);
    });

    it('should still reject with default validator', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 404,
          statusText: 'Not Found',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );

      const api = createFetchX();
      await expect(api.get('/not-found')).rejects.toThrow(
        'Request failed with status 404'
      );
    });

    it('should support per-request validateStatus override', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 304,
        statusText: 'Not Modified',
        headers: new Headers({}),
        blob: () => Promise.resolve(new Blob()),
      });

      const api = createFetchX();
      const result = await api.get('/not-modified', {
        validateStatus: (status: number) => status === 304,
      });
      expect(result.data).toBeInstanceOf(Blob);
    });
  });

  describe('responseType', () => {
    it('should force text parsing despite JSON content-type', async () => {
      const textData = '{"key":"value"}';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ key: 'value' }),
        text: () => Promise.resolve(textData),
      });

      const api = createFetchX({ responseType: 'text' });
      const result = await api.get('/data');
      expect(result.data).toBe(textData);
    });

    it('should force blob parsing', async () => {
      const blob = new Blob(['test']);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
        blob: () => Promise.resolve(blob),
      });

      const api = createFetchX({ responseType: 'blob' });
      const result = await api.get('/file');
      expect(result.data).toBe(blob);
    });

    it('should support per-request responseType override', async () => {
      const textData = 'plain text response';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(textData),
      });

      const api = createFetchX();
      const result = await api.get('/text', { responseType: 'text' });
      expect(result.data).toBe(textData);
    });

    it('should return FetchXResponse with data, status, headers, config', async () => {
      const mockData = { id: 1 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Headers({
          'content-type': 'application/json',
          'x-request-id': 'abc',
        }),
        json: () => Promise.resolve(mockData),
      });

      const api = createFetchX({ baseURL: 'https://api.example.com' });
      const result = await api.get('/users');

      expect(result.data).toEqual(mockData);
      expect(result.status).toBe(201);
      expect(result.statusText).toBe('Created');
      expect(result.headers).toBeInstanceOf(Headers);
      expect(result.headers.get('x-request-id')).toBe('abc');
      expect(result.config).toBeDefined();
      expect(result.config.method).toBe('GET');
      expect(result.config.url).toBe('/users');
    });
  });

  describe('api.request(config)', () => {
    it('should make a GET request via request()', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 1 }),
      });

      const api = createFetchX();
      const result = await api.request({
        method: 'GET',
        url: '/users',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.data).toEqual({ id: 1 });
    });

    it('should make a POST request via request()', async () => {
      const postBody = { name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 1 }),
      });

      const api = createFetchX();
      const result = await api.request({
        method: 'POST',
        url: '/users',
        body: postBody,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postBody),
        })
      );
      expect(result.data).toEqual({ id: 1 });
    });

    it('should default to GET when no method is specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const api = createFetchX();
      await api.request({ url: '/default' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/default',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('dedupe', () => {
    it('should cancel previous identical request when dedupe is enabled', async () => {
      let firstAborted = false;
      mockFetch.mockImplementationOnce(
        (_url: string, _options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            if (_options?.signal) {
              _options.signal.addEventListener('abort', () => {
                firstAborted = true;
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          })
      );

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'second' }), {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );

      const api = createFetchX({ dedupe: true });

      const first = api.get('/dedupe-test');
      // Small delay to let first request start before second comes in
      await new Promise(resolve => setTimeout(resolve, 5));
      // Catch immediately to avoid unhandled rejection
      const firstError = first.then(null, e => e);
      const second = api.get('/dedupe-test');

      const secondResult = await second;
      expect(secondResult.data).toEqual({ data: 'second' });

      const err = await firstError;
      expect(err).toBeInstanceOf(CancelError);
      expect(err.message).toBe('Request canceled');
      expect(firstAborted).toBe(true);
    });

    it('should not cancel requests to different URLs', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'a' }), {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'b' }), {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );

      const api = createFetchX({ dedupe: true });

      const [a, b] = await Promise.all([api.get('/url-a'), api.get('/url-b')]);

      expect(a.data).toEqual({ data: 'a' });
      expect(b.data).toEqual({ data: 'b' });
    });
  });

  describe('streaming', () => {
    it.each([
      {
        name: 'raw',
        body: ['chunk'],
        consume: async (api: ReturnType<typeof createFetchX>) => {
          for await (const chunk of await api.stream('/stream')) {
            void chunk;
          }
        },
      },
      {
        name: 'SSE',
        body: ['data: value\n\n'],
        consume: async (api: ReturnType<typeof createFetchX>) => {
          for await (const event of await api.sse('/stream')) {
            void event;
          }
        },
      },
      {
        name: 'NDJSON',
        body: ['{"value":1}\n'],
        consume: async (api: ReturnType<typeof createFetchX>) => {
          for await (const entry of await api.ndjson('/stream')) {
            void entry;
          }
        },
      },
    ])('should report $name completion once', async ({ body, consume }) => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody(body), { status: 200 })
      );
      const onStreamEnd = vi.fn();
      const onStreamError = vi.fn();
      const api = createFetchX();
      api.use({ name: 'lifecycle', onStreamEnd, onStreamError });

      await consume(api);

      expect(onStreamEnd).toHaveBeenCalledOnce();
      expect(onStreamEnd.mock.calls[0][1]).toBe('complete');
      expect(onStreamError).not.toHaveBeenCalled();
    });

    it('should report early iteration exit as cancellation once', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody(['first', 'second']), { status: 200 })
      );
      const onStreamEnd = vi.fn();
      const api = createFetchX();
      api.use({ name: 'lifecycle', onStreamEnd });

      for await (const chunk of await api.stream('/stream')) {
        void chunk;
        break;
      }

      expect(onStreamEnd).toHaveBeenCalledOnce();
      expect(onStreamEnd.mock.calls[0][1]).toBe('cancelled');
    });

    it('should report explicit abort as cancellation once', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody(['chunk']), { status: 200 })
      );
      const onStreamEnd = vi.fn();
      const api = createFetchX();
      api.use({ name: 'lifecycle', onStreamEnd });

      const stream = await api.stream('/stream');
      stream.abort();
      stream.abort();
      await Promise.resolve();

      expect(onStreamEnd).toHaveBeenCalledOnce();
      expect(onStreamEnd.mock.calls[0][1]).toBe('cancelled');
    });

    it('should report stream parsing errors once', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody(['not-json\n']), { status: 200 })
      );
      const onStreamEnd = vi.fn();
      const onStreamError = vi.fn();
      const api = createFetchX();
      api.use({ name: 'lifecycle', onStreamEnd, onStreamError });

      const stream = await api.ndjson('/stream');
      await expect(async () => {
        for await (const entry of stream) {
          void entry;
        }
      }).rejects.toBeInstanceOf(SyntaxError);

      expect(onStreamError).toHaveBeenCalledOnce();
      expect(onStreamError.mock.calls[0][0]).toBeInstanceOf(SyntaxError);
      expect(onStreamError.mock.calls[0][1]).toBe(stream);
      expect(onStreamEnd).not.toHaveBeenCalled();
    });

    it.each([
      {
        name: 'raw',
        create: (api: ReturnType<typeof createFetchX>) => api.stream('/stream'),
      },
      {
        name: 'SSE',
        create: (api: ReturnType<typeof createFetchX>) => api.sse('/stream'),
      },
      {
        name: 'NDJSON',
        create: (api: ReturnType<typeof createFetchX>) => api.ndjson('/stream'),
      },
    ])('should report $name read errors once', async ({ create }) => {
      const readError = new Error('read failed');
      mockFetch.mockResolvedValueOnce(
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              controller.error(readError);
            },
          }),
          { status: 200 }
        )
      );
      const onStreamEnd = vi.fn();
      const onStreamError = vi.fn();
      const api = createFetchX();
      api.use({ name: 'lifecycle', onStreamEnd, onStreamError });

      const stream = await create(api);
      await expect(async () => {
        for await (const value of stream) {
          void value;
        }
      }).rejects.toThrow('read failed');

      expect(onStreamError).toHaveBeenCalledOnce();
      expect(onStreamError.mock.calls[0][0]).toBe(readError);
      expect(onStreamEnd).not.toHaveBeenCalled();
    });

    it('should report errors thrown by onStream plugins', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody([]), { status: 200 })
      );
      const pluginError = new Error('stream plugin failed');
      const onStreamError = vi.fn();
      const api = createFetchX();
      api.use({
        name: 'observer',
        priority: 0,
        onStreamError,
      });
      api.use({
        name: 'failing',
        priority: 1,
        onStream: () => {
          throw pluginError;
        },
      });

      await expect(api.stream('/stream')).rejects.toBe(pluginError);
      expect(onStreamError).toHaveBeenCalledOnce();
      expect(onStreamError.mock.calls[0]).toEqual([
        pluginError,
        expect.any(FetchXStream),
        expect.objectContaining({ url: '/stream', method: 'GET' }),
      ]);
    });

    it('should return ReadableStream for responseType: "stream"', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody(['hello', 'world']), {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/octet-stream' }),
        })
      );

      const api = createFetchX();
      const result = await api.get('/file', { responseType: 'stream' });

      expect(result.data).toBeInstanceOf(ReadableStream);
      expect(result.status).toBe(200);

      // Read the stream to verify content
      const reader = (result.data as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value);
      }
      expect(text).toBe('helloworld');
    });

    it('should stream raw Uint8Array via api.stream()', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody(['chunk1', 'chunk2']), {
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
        })
      );

      const api = createFetchX();
      const stream = await api.stream('/download');

      expect(stream).toBeInstanceOf(FetchXStream);
      expect(stream.response.status).toBe(200);

      const decoder = new TextDecoder();
      const parts: string[] = [];
      for await (const chunk of stream) {
        parts.push(decoder.decode(chunk));
      }

      expect(parts).toEqual(['chunk1', 'chunk2']);
    });

    it('should parse SSE events via api.sse()', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          mockStreamBody(['data: {"msg":"hi"}\n\n', 'data: [DONE]\n\n']),
          { status: 200, statusText: 'OK', headers: new Headers() }
        )
      );

      const api = createFetchX();
      const stream = await api.sse('/chat');

      expect(stream).toBeInstanceOf(FetchXStream);

      const events: Array<{ data: string }> = [];
      for await (const event of stream) {
        events.push(event);
      }

      expect(events).toEqual([{ data: '{"msg":"hi"}' }, { data: '[DONE]' }]);
    });

    it('should parse NDJSON via api.ndjson()', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody(['{"id":1}\n', '{"id":2}\n']), {
          status: 200,
          statusText: 'OK',
          headers: new Headers({
            'content-type': 'application/x-ndjson',
          }),
        })
      );

      const api = createFetchX();
      const stream = await api.ndjson<{ id: number }>('/logs/stream');

      const entries: Array<{ id: number }> = [];
      for await (const entry of stream) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({ id: 1 });
      expect(entries[1]).toEqual({ id: 2 });
    });

    it('should throw HTTPError with parsed body for SSE by default', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );

      const api = createFetchX({
        sanitizeConfig: true,
        headers: {
          Authorization: 'Bearer secret',
          'x-api-key': 'secret',
        },
      });
      const error = await api.sse('/chat').catch(value => value as HTTPError);

      expect(error).toBeInstanceOf(HTTPError);
      expect(error.status).toBe(401);
      expect(error.response.data).toEqual({ error: 'unauthorized' });
      expect(error.config?.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      });
      expect(error.response.config.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      });
    });

    it('should leave the response body unlocked when HTTP errors are allowed', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      );

      const api = createFetchX();
      const stream = await api.sse('/chat', { throwHttpErrors: false });

      expect(stream.response.status).toBe(401);
      expect(stream.response.body?.locked).toBe(false);
      await expect(stream.response.json()).resolves.toEqual({
        error: 'unauthorized',
      });
    });

    it('should apply connectTimeout while waiting for response headers', async () => {
      vi.useFakeTimers();
      try {
        mockFetch.mockImplementationOnce(
          (_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
              init.signal?.addEventListener(
                'abort',
                () =>
                  reject(
                    new DOMException('The operation was aborted', 'AbortError')
                  ),
                { once: true }
              );
            })
        );

        const api = createFetchX({
          sanitizeConfig: true,
          headers: { Authorization: 'Bearer secret' },
        });
        const pending = api
          .sse('/chat', { connectTimeout: 100 })
          .catch(error => error as TimeoutError);

        await vi.advanceTimersByTimeAsync(100);
        const error = await pending;
        expect(error).toMatchObject({
          name: 'TimeoutError',
          timeout: 100,
          phase: 'connect',
        } satisfies Partial<TimeoutError>);
        expect(error.config?.headers).toEqual({
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not fetch when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const api = createFetchX({
        sanitizeConfig: true,
        headers: { Authorization: 'Bearer secret' },
      });

      const error = await api
        .sse('/chat', { signal: controller.signal })
        .catch(value => value as CancelError);

      expect(error).toBeInstanceOf(CancelError);
      expect(error.config?.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should sanitize config on streaming network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
      const api = createFetchX({
        sanitizeConfig: true,
        headers: {
          Authorization: 'Bearer secret',
          'x-api-key': 'secret',
          'x-request-id': 'safe',
        },
      });

      const error = await api
        .sse('/chat')
        .catch(value => value as NetworkError);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.config?.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'x-request-id': 'safe',
      });
    });

    it('should notify plugins when stream connection fails', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
      const onStreamError = vi.fn();
      const api = createFetchX();
      api.use({ name: 'lifecycle', onStreamError });

      await expect(api.sse('/chat')).rejects.toBeInstanceOf(NetworkError);

      expect(onStreamError).toHaveBeenCalledOnce();
      expect(onStreamError.mock.calls[0][0]).toBeInstanceOf(NetworkError);
      expect(onStreamError.mock.calls[0][1]).toBeUndefined();
    });

    it('should classify a custom stream abort reason as CancelError', async () => {
      const controller = new AbortController();
      const executor = vi.fn(
        (_url: RequestInfo | URL, options?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason),
              { once: true }
            );
          })
      );
      const api = createFetchX({ requestExecutor: executor });

      const pending = api.sse('/chat', { signal: controller.signal });
      await vi.waitFor(() => expect(executor).toHaveBeenCalledOnce());
      controller.abort(new Error('user stop'));

      await expect(pending).rejects.toBeInstanceOf(CancelError);
    });

    it('should preserve SSE defaults when custom headers are provided', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody([]), { status: 200 })
      );
      const api = createFetchX();

      await api.sse('/chat', {
        headers: { Authorization: 'Bearer token' },
      });

      const headers = new Headers(mockFetch.mock.calls[0][1].headers);
      expect(headers.get('accept')).toBe('text/event-stream');
      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.get('authorization')).toBe('Bearer token');
    });

    it('should override SSE defaults case-insensitively', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody([]), { status: 200 })
      );
      const api = createFetchX({
        headers: { Authorization: 'Bearer instance' },
      });

      await api.sse('/chat', {
        headers: {
          accept: 'application/json',
          'content-type': 'application/custom',
          authorization: 'Bearer request',
        },
      });

      const headers = new Headers(mockFetch.mock.calls[0][1].headers);
      expect([...headers.entries()]).toEqual([
        ['accept', 'application/json'],
        ['authorization', 'Bearer request'],
        ['content-type', 'application/custom'],
      ]);
    });

    it('should normalize duplicate header casing added by interceptors', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody([]), { status: 200 })
      );
      const api = createFetchX({
        headers: { Authorization: 'Bearer instance' },
      });
      api.interceptors.request.use(config => ({
        ...config,
        headers: {
          ...config.headers,
          authorization: 'Bearer interceptor',
        },
      }));

      await api.sse('/chat');

      const headers = new Headers(mockFetch.mock.calls[0][1].headers);
      expect(headers.get('authorization')).toBe('Bearer interceptor');
    });

    it('should use paramsSerializer for streaming URLs', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(mockStreamBody([]), { status: 200 })
      );
      const api = createFetchX({ baseURL: 'https://api.example.com' });

      await api.sse('/chat', {
        params: { signature: 'ignored' },
        paramsSerializer: () => 'signature=custom%2Bvalue',
      });

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.example.com/chat?signature=custom%2Bvalue'
      );
    });
  });
});
