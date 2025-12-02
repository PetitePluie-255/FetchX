/**
 * 工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  serializeParams,
  buildURL,
  serializeBody,
  createFetchXError,
  mergeConfig,
  isSuccessStatus,
  isCancel,
} from '../src/utils';

describe('Utils', () => {
  describe('serializeParams', () => {
    it('should serialize simple params', () => {
      const params = { name: 'test', age: 25 };
      const result = serializeParams(params);
      expect(result).toBe('name=test&age=25');
    });

    it('should handle array params', () => {
      const params = { tags: ['tag1', 'tag2'] };
      const result = serializeParams(params);
      expect(result).toBe('tags=tag1&tags=tag2');
    });

    it('should skip null and undefined values', () => {
      const params = { name: 'test', age: null, city: undefined };
      const result = serializeParams(params);
      expect(result).toBe('name=test');
    });
  });

  describe('buildURL', () => {
    it('should build URL with baseURL', () => {
      const result = buildURL('https://api.example.com', '/users');
      expect(result).toBe('https://api.example.com/users');
    });

    it('should build URL with params', () => {
      const result = buildURL('', '/users', { page: 1, limit: 10 });
      expect(result).toBe('/users?page=1&limit=10');
    });

    it('should handle existing query params', () => {
      const result = buildURL('', '/users?existing=1', { page: 1 });
      expect(result).toBe('/users?existing=1&page=1');
    });
  });

  describe('serializeBody', () => {
    it('should serialize object to JSON', () => {
      const body = { name: 'test' };
      const result = serializeBody(body);
      expect(result).toBe('{"name":"test"}');
    });

    it('should return string as is', () => {
      const result = serializeBody('test string');
      expect(result).toBe('test string');
    });

    it('should return FormData as is', () => {
      const formData = new FormData();
      formData.append('name', 'test');
      const result = serializeBody(formData);
      expect(result).toBe(formData);
    });

    it('should handle null and undefined', () => {
      expect(serializeBody(null)).toBe('');
      expect(serializeBody(undefined)).toBe('');
    });
  });

  describe('createFetchXError', () => {
    it('should create error with message', () => {
      const error = createFetchXError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.isAxiosError).toBe(true);
    });

    it('should create error with config', () => {
      const config = { url: '/test' };
      const error = createFetchXError('Test error', config);
      expect(error.config).toBe(config);
    });
  });

  describe('mergeConfig', () => {
    it('should merge simple configs', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = mergeConfig(target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should deep merge objects', () => {
      const target = { a: { x: 1 }, b: 2 };
      const source = { a: { y: 2 }, c: 3 };
      const result = mergeConfig(target, source);
      expect(result).toEqual({ a: { x: 1, y: 2 }, b: 2, c: 3 });
    });
  });

  describe('isSuccessStatus', () => {
    it('should return true for 2xx status codes', () => {
      expect(isSuccessStatus(200)).toBe(true);
      expect(isSuccessStatus(201)).toBe(true);
      expect(isSuccessStatus(299)).toBe(true);
    });

    it('should return false for non-2xx status codes', () => {
      expect(isSuccessStatus(199)).toBe(false);
      expect(isSuccessStatus(300)).toBe(false);
      expect(isSuccessStatus(404)).toBe(false);
      expect(isSuccessStatus(500)).toBe(false);
    });
  });

  describe('isCancel', () => {
    it('should return true for FetchX ERR_CANCELED', () => {
      const error = { code: 'ERR_CANCELED' };
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for FetchX ECONNABORTED (timeout)', () => {
      const error = { code: 'ECONNABORTED' };
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for native AbortError', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for Axios CanceledError', () => {
      const error = new Error('Request canceled');
      error.name = 'CanceledError';
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for Axios __CANCEL__ flag', () => {
      const error = { __CANCEL__: true, message: 'Canceled' };
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for errors with "cancel" in message', () => {
      const error = new Error('Request was canceled by user');
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for errors with "abort" in message', () => {
      const error = new Error('The request was aborted');
      expect(isCancel(error)).toBe(true);
    });

    it('should return true for errors with uppercase keywords', () => {
      const error = new Error('REQUEST CANCELED');
      expect(isCancel(error)).toBe(true);
    });

    it('should return false for other errors', () => {
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
    });
  });
});
