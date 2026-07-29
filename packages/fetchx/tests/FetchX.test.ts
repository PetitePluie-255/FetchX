import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchX } from '../src/FetchX';
import {
  FetchXError,
  CancelError,
  HTTPError,
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

      const api = createFetchX();
      try {
        await api.get('/not-found');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchXError);
        const fetchXError = error as FetchXError;
        expect(fetchXError.message).toContain('404');
        expect(fetchXError.code).toBe('ERR_BAD_RESPONSE');
        expect(fetchXError.isAxiosError).toBe(true);
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

      expect(events).toHaveLength(1);
      expect(events[0].data).toBe('{"msg":"hi"}');
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

      const api = createFetchX();
      const error = await api.sse('/chat').catch(value => value as HTTPError);

      expect(error).toBeInstanceOf(HTTPError);
      expect(error.status).toBe(401);
      expect(error.response.data).toEqual({ error: 'unauthorized' });
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

        const api = createFetchX();
        const pending = api.sse('/chat', { connectTimeout: 100 });
        const assertion = expect(pending).rejects.toMatchObject({
          name: 'TimeoutError',
          timeout: 100,
          phase: 'connect',
        } satisfies Partial<TimeoutError>);

        await vi.advanceTimersByTimeAsync(100);
        await assertion;
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
