/**
 * 拦截器功能测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchX } from '../src/createFetchX';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Interceptors', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should execute request interceptors', async () => {
    const mockResponse = { data: 'test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse),
    });

    const api = createFetchX();
    
    // 添加请求拦截器
    const requestInterceptor = vi.fn((config) => {
      config.headers = { ...config.headers, 'X-Custom': 'test' };
      return config;
    });
    
    api.interceptors.request.use(requestInterceptor);

    await api.get('/test');

    expect(requestInterceptor).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
  });

  it('should execute response interceptors', async () => {
    const mockResponse = { data: 'test' };
    const mockFetchResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse),
    };
    
    mockFetch.mockResolvedValueOnce(mockFetchResponse);

    const api = createFetchX();
    
    // 添加响应拦截器
    const responseInterceptor = vi.fn((response) => {
      return response;
    });
    
    api.interceptors.response.use(responseInterceptor);

    await api.get('/test');

    expect(responseInterceptor).toHaveBeenCalledWith(mockFetchResponse);
  });

  it('should support async interceptors', async () => {
    const mockResponse = { data: 'test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse),
    });

    const api = createFetchX();
    
    // 添加异步请求拦截器
    const asyncRequestInterceptor = vi.fn(async (config) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      config.headers = { ...config.headers, 'X-Async': 'test' };
      return config;
    });
    
    api.interceptors.request.use(asyncRequestInterceptor);

    await api.get('/test');

    expect(asyncRequestInterceptor).toHaveBeenCalled();
  });

  it('should support interceptor ejection', async () => {
    const api = createFetchX();
    
    const interceptor = vi.fn();
    const id = api.interceptors.request.use(interceptor);
    
    // 移除拦截器
    api.interceptors.request.eject(id);
    
    const mockResponse = { data: 'test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse),
    });

    await api.get('/test');

    expect(interceptor).not.toHaveBeenCalled();
  });
});
