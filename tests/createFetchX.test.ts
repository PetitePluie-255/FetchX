/**
 * FetchX 核心功能测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchX } from '../src/createFetchX';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('createFetchX', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create instance with default config', () => {
    const api = createFetchX();
    expect(api).toBeDefined();
    expect(api.get).toBeDefined();
    expect(api.post).toBeDefined();
    expect(api.interceptors).toBeDefined();
  });

  it('should create instance with custom config', () => {
    const config = {
      baseURL: 'https://api.example.com',
      timeout: 5000,
      headers: {
        Authorization: 'Bearer token',
      },
    };
    const api = createFetchX(config);
    expect(api).toBeDefined();
  });

  it('should make GET request', async () => {
    const mockResponse = { data: 'test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse),
    });

    const api = createFetchX();
    const result = await api.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should make POST request with body', async () => {
    const mockResponse = { success: true };
    const requestBody = { name: 'test' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse),
    });

    const api = createFetchX();
    const result = await api.post('/test', requestBody);

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: expect.any(Headers),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should handle request timeout', async () => {
    const api = createFetchX({ timeout: 50 });

    // Mock fetch to handle abort signal
    mockFetch.mockImplementationOnce((url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }
        // Never resolve to simulate timeout
      });
    });

    await expect(api.get('/test')).rejects.toThrow('Request timeout');
  }, 2000);

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const api = createFetchX();
    await expect(api.get('/test')).rejects.toThrow('Network error');
  });

  it('should handle non-2xx responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
    });

    const api = createFetchX();
    await expect(api.get('/test')).rejects.toThrow(
      'Request failed with status 404'
    );
  });
});
