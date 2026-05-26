import { describe, it, expect } from 'vitest';
import {
  serializeParams,
  buildURL,
  serializeBody,
  parseResponse,
  createFetchXError,
  mergeConfig,
  isSuccessStatus,
  isCancel,
} from '../src/utils';
import { FetchXError, CancelError } from '../src/types';

describe('Utils', () => {
  describe('serializeParams', () => {
    it('should serialize simple params', () => {
      const result = serializeParams({ name: 'test', age: '25' });
      expect(result).toBe('name=test&age=25');
    });

    it('should handle array params', () => {
      const result = serializeParams({ tags: ['tag1', 'tag2'] });
      expect(result).toBe('tags%5B%5D=tag1&tags%5B%5D=tag2');
    });

    it('should skip null and undefined values', () => {
      const result = serializeParams({
        name: 'test',
        age: null,
        city: undefined,
      });
      expect(result).toBe('name=test');
    });

    it('should return empty string for empty params', () => {
      const result = serializeParams({});
      expect(result).toBe('');
    });

    it('should handle numeric values', () => {
      const result = serializeParams({ page: 1, limit: 10 });
      expect(result).toBe('page=1&limit=10');
    });

    it('should handle boolean values', () => {
      const result = serializeParams({ active: true, verified: false });
      expect(result).toBe('active=true&verified=false');
    });

    it('should handle nested objects using bracket notation', () => {
      const result = serializeParams({
        filter: { status: 'active', age: '25' },
      });
      expect(result).toBe('filter%5Bstatus%5D=active&filter%5Bage%5D=25');
    });

    it('should handle deeply nested objects', () => {
      const result = serializeParams({ query: { match: { name: 'test' } } });
      expect(result).toBe('query%5Bmatch%5D%5Bname%5D=test');
    });
  });

  describe('buildURL', () => {
    it('should build URL with baseURL', () => {
      const result = buildURL('https://api.example.com', '/users');
      expect(result).toBe('https://api.example.com/users');
    });

    it('should handle baseURL with trailing slash', () => {
      const result = buildURL('https://api.example.com/', '/users');
      expect(result).toBe('https://api.example.com/users');
    });

    it('should handle url with leading slash', () => {
      const result = buildURL('https://api.example.com', '/users');
      expect(result).toBe('https://api.example.com/users');
    });

    it('should build URL with params', () => {
      const result = buildURL('', '/users', { page: '1', limit: '10' });
      expect(result).toBe('/users?page=1&limit=10');
    });

    it('should handle existing query params', () => {
      const result = buildURL('', '/users?existing=1', { page: '1' });
      expect(result).toBe('/users?existing=1&page=1');
    });

    it('should handle url-only case', () => {
      const result = buildURL('', '/users');
      expect(result).toBe('/users');
    });

    it('should handle url without baseURL and params', () => {
      const result = buildURL('', 'https://full.url/path');
      expect(result).toBe('https://full.url/path');
    });
  });

  describe('serializeBody', () => {
    it('should serialize object to JSON', () => {
      const result = serializeBody({ name: 'test' });
      expect(result).toBe('{"name":"test"}');
    });

    it('should return string as-is', () => {
      const result = serializeBody('test string');
      expect(result).toBe('test string');
    });

    it('should return FormData as-is', () => {
      const formData = new FormData();
      formData.append('name', 'test');
      const result = serializeBody(formData);
      expect(result).toBe(formData);
    });

    it('should return Blob as-is', () => {
      const blob = new Blob(['test']);
      const result = serializeBody(blob);
      expect(result).toBe(blob);
    });

    it('should return ArrayBuffer as-is', () => {
      const buffer = new ArrayBuffer(8);
      const result = serializeBody(buffer);
      expect(result).toBe(buffer);
    });

    it('should return undefined for null', () => {
      const result = serializeBody(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      const result = serializeBody(undefined);
      expect(result).toBeUndefined();
    });

    it('should convert number to string', () => {
      const result = serializeBody(123);
      expect(result).toBe('123');
    });

    it('should convert boolean to string', () => {
      const result = serializeBody(true);
      expect(result).toBe('true');
    });

    it('should serialize URLSearchParams to string', () => {
      const params = new URLSearchParams();
      params.append('name', 'test');
      params.append('age', '25');
      const result = serializeBody(params);
      expect(result).toBe('name=test&age=25');
    });
  });

  describe('FetchXError', () => {
    it('should create a FetchXError instance', () => {
      const error = new FetchXError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FetchXError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('FetchXError');
      expect(error.isAxiosError).toBe(true);
    });

    it('should set optional properties', () => {
      const config = { url: '/test' };
      const error = new FetchXError('Test', config, 'ERR_CUSTOM');
      expect(error.config).toBe(config);
      expect(error.code).toBe('ERR_CUSTOM');
    });
  });

  describe('createFetchXError', () => {
    it('should create a FetchXError via factory', () => {
      const error = createFetchXError('Factory error');
      expect(error).toBeInstanceOf(FetchXError);
      expect(error.message).toBe('Factory error');
    });

    it('should pass config and code', () => {
      const config = { url: '/api' };
      const error = createFetchXError('Error', config, 'ERR_TEST');
      expect(error.config).toBe(config);
      expect(error.code).toBe('ERR_TEST');
      expect(error.isAxiosError).toBe(true);
    });
  });

  describe('mergeConfig', () => {
    it('should merge headers from both configs', () => {
      const instance = {
        headers: { 'X-Default': '1' },
      };
      const request = {
        headers: { 'X-Custom': '2' },
      };
      const result = mergeConfig(instance, request);
      expect(result.headers).toEqual({ 'X-Default': '1', 'X-Custom': '2' });
    });

    it('should override instance headers with request headers', () => {
      const instance = {
        headers: { 'Content-Type': 'application/json' },
      };
      const request = {
        headers: { 'Content-Type': 'text/plain' },
      };
      const result = mergeConfig(instance, request);
      expect(result.headers).toEqual({ 'Content-Type': 'text/plain' });
    });

    it('should use instance baseURL when request does not specify', () => {
      const instance = { baseURL: 'https://api.example.com' };
      const request = {};
      const result = mergeConfig(instance, request);
      expect(result.baseURL).toBe('https://api.example.com');
    });

    it('should use request timeout when specified', () => {
      const instance = { timeout: 5000 };
      const request = { timeout: 10000 };
      const result = mergeConfig(instance, request);
      expect(result.timeout).toBe(10000);
    });

    it('should fall back to instance timeout when request timeout is undefined', () => {
      const instance = { timeout: 5000 };
      const request = {};
      const result = mergeConfig(instance, request);
      expect(result.timeout).toBe(5000);
    });

    it('should merge credentials', () => {
      const instance = { credentials: 'same-origin' as RequestCredentials };
      const request = {};
      const result = mergeConfig(instance, request);
      expect(result.credentials).toBe('same-origin');
    });
  });

  describe('isSuccessStatus', () => {
    it('should return true for 2xx status codes', () => {
      expect(isSuccessStatus(200)).toBe(true);
      expect(isSuccessStatus(201)).toBe(true);
      expect(isSuccessStatus(204)).toBe(true);
      expect(isSuccessStatus(299)).toBe(true);
    });

    it('should return false for non-2xx status codes', () => {
      expect(isSuccessStatus(199)).toBe(false);
      expect(isSuccessStatus(300)).toBe(false);
      expect(isSuccessStatus(301)).toBe(false);
      expect(isSuccessStatus(400)).toBe(false);
      expect(isSuccessStatus(404)).toBe(false);
      expect(isSuccessStatus(500)).toBe(false);
      expect(isSuccessStatus(502)).toBe(false);
    });
  });

  describe('isCancel', () => {
    it('should return true for CancelError instance', () => {
      const error = new CancelError();
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for native AbortError', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for FetchXError with ERR_CANCELED code', () => {
      const error = new FetchXError('Canceled', undefined, 'ERR_CANCELED');
      expect(isCancel(error)).toBe(true);
    });

    it('should return false for ECONNABORTED (timeout, not cancel)', () => {
      const error = new FetchXError('Timeout', undefined, 'ECONNABORTED');
      expect(isCancel(error)).toBe(false);
    });

    it('should return false for CanceledError name (axios compat removed)', () => {
      const error = new Error('Request canceled');
      error.name = 'CanceledError';
      expect(isCancel(error)).toBe(false);
    });

    it('should return false for __CANCEL__ flag (axios compat removed)', () => {
      const error = { __CANCEL__: true, message: 'Canceled' };
      expect(isCancel(error)).toBe(false);
    });

    it('should return false for message keyword heuristics (removed)', () => {
      expect(isCancel(new Error('Request was canceled by user'))).toBe(false);
      expect(isCancel(new Error('The request was aborted'))).toBe(false);
      expect(isCancel(new Error('REQUEST CANCELED'))).toBe(false);
    });

    it('should return false for non-cancel errors', () => {
      const error = new Error('Some other error');
      expect(isCancel(error)).toBe(false);
    });

    it('should return false for network errors', () => {
      const error = { code: 'ERR_NETWORK', message: 'Network Error' };
      expect(isCancel(error)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isCancel(null)).toBe(false);
      expect(isCancel(undefined)).toBe(false);
      expect(isCancel('string')).toBe(false);
      expect(isCancel(123)).toBe(false);
      expect(isCancel(true)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isCancel({})).toBe(false);
    });
  });
});

describe('parseResponse', () => {
  it('should return null for empty JSON response body', async () => {
    // Use status 200 with empty body to simulate the SyntaxError case
    const response = new Response('', {
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
    });
    const result = await parseResponse(response);
    expect(result).toBeNull();
  });

  it('should return null for empty JSON with explicit responseType: json', async () => {
    const response = new Response('', {
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
    });
    const result = await parseResponse(response, 'json');
    expect(result).toBeNull();
  });
});
