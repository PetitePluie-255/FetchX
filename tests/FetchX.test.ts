import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchX } from '../src/FetchX';
import { FetchXError } from '../src/types';

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
        }),
      );
      expect(result).toEqual(mockData);
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
        expect.any(Object),
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
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should support FormData body', async () => {
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

      expect(mockFetch).toHaveBeenCalledWith(
        '/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        }),
      );
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
        }),
      );
      expect(result).toEqual(putBody);
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
        expect.objectContaining({ method: 'DELETE' }),
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
        }),
      );
      expect(result).toEqual(patchBody);
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
        expect.objectContaining({ method: 'HEAD' }),
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
        expect.any(Object),
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
          }),
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
      expect(result).toEqual({ data: 'ok' });
    });
  });

  describe('cancel', () => {
    it('should reject when user signal is aborted before request', async () => {
      const controller = new AbortController();
      controller.abort();

      const api = createFetchX();

      await expect(
        api.get('/test', { signal: controller.signal }),
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
          }),
      );

      const promise = api.get('/test', { signal: controller.signal });
      await new Promise(resolve => setTimeout(resolve, 10));
      controller.abort();

      await expect(promise).rejects.toThrow('Request canceled');
    });
  });

  describe('error handling', () => {
    it('should throw FetchXError on non-2xx status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

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
        }),
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
      expect(result).toBe('plain text');
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
      expect(result).toBe(blob);
    });
  });
});
