import { describe, it, expect } from 'vitest';
import { CacheStore, createCacheKey } from '../src/cache';

describe('createCacheKey', () => {
  it('should create key from method and URL', () => {
    const key = createCacheKey('GET', '/users');
    expect(key).toBe('get|/users');
  });

  it('should include sorted params', () => {
    const key = createCacheKey('GET', '/users', { b: '2', a: '1', c: '3' });
    expect(key).toContain('p:a=1,b=2,c=3');
  });

  it('should include raw body', () => {
    const key = createCacheKey('POST', '/users', undefined, { name: 'test' });
    expect(key).toContain('b:{"name":"test"}');
  });

  it('should sort body keys for stable serialization', () => {
    const key1 = createCacheKey('POST', '/users', undefined, { a: 1, b: 2 });
    const key2 = createCacheKey('POST', '/users', undefined, { b: 2, a: 1 });
    expect(key1).toBe(key2);
  });

  it('should produce different keys for different URLs', () => {
    const key1 = createCacheKey('GET', '/users/1');
    const key2 = createCacheKey('GET', '/users/2');
    expect(key1).not.toBe(key2);
  });
});

describe('CacheStore', () => {
  it('should store and retrieve a value', () => {
    const store = new CacheStore();
    const key = 'get|/test';

    const mockResponse = new Response(null, {
      status: 200,
      statusText: 'OK',
    });

    store.set(key, { data: 'hello' }, mockResponse);
    expect(store.get(key)).toEqual({ data: 'hello' });
    expect(store.has(key)).toBe(true);
  });

  it('should return undefined for missing key', () => {
    const store = new CacheStore();
    expect(store.get('missing')).toBeUndefined();
    expect(store.has('missing')).toBe(false);
  });

  it('should expire entries based on TTL', async () => {
    const store = new CacheStore();
    const key = 'get|/test';

    store.set(key, 'data', new Response(), 50);

    // Should be valid immediately
    expect(store.get(key)).toBe('data');

    // Wait for TTL to expire
    await new Promise(r => setTimeout(r, 60));
    expect(store.get(key)).toBeUndefined();
  });

  it('should evict oldest entries when exceeding maxSize', () => {
    const store = new CacheStore({ maxSize: 2 });
    const r = new Response();

    store.set('key1', 'a', r);
    store.set('key2', 'b', r);
    store.set('key3', 'c', r);

    expect(store.get('key1')).toBeUndefined(); // evicted (oldest)
    expect(store.get('key2')).toBe('b');
    expect(store.get('key3')).toBe('c');
  });

  it('should delete a specific key', () => {
    const store = new CacheStore();
    const r = new Response();

    store.set('key1', 'a', r);
    expect(store.delete('key1')).toBe(true);
    expect(store.delete('key1')).toBe(false);
    expect(store.get('key1')).toBeUndefined();
  });

  it('should clear all entries', () => {
    const store = new CacheStore();
    const r = new Response();

    store.set('a', 1, r);
    store.set('b', 2, r);
    store.clear();

    expect(store.get('a')).toBeUndefined();
    expect(store.get('b')).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it('should report correct size', () => {
    const store = new CacheStore();
    const r = new Response();

    expect(store.size).toBe(0);
    store.set('a', 1, r);
    expect(store.size).toBe(1);
    store.set('b', 2, r);
    expect(store.size).toBe(2);
  });

  describe('isCacheable', () => {
    it('should return true for GET by default', () => {
      const store = new CacheStore({ ttl: 60000 });
      expect(store.isCacheable({ ttl: 60000 }, 'GET')).toBe(true);
      expect(store.isCacheable({ ttl: 60000 }, 'get')).toBe(true);
    });

    it('should return false for POST by default', () => {
      const store = new CacheStore({ ttl: 60000 });
      expect(store.isCacheable({ ttl: 60000 }, 'POST')).toBe(false);
    });

    it('should respect custom methods config', () => {
      const store = new CacheStore({ ttl: 60000, methods: ['GET', 'POST'] });
      expect(
        store.isCacheable({ ttl: 60000, methods: ['GET', 'POST'] }, 'GET')
      ).toBe(true);
      expect(
        store.isCacheable({ ttl: 60000, methods: ['GET', 'POST'] }, 'POST')
      ).toBe(true);
      expect(
        store.isCacheable({ ttl: 60000, methods: ['GET', 'POST'] }, 'DELETE')
      ).toBe(false);
    });

    it('should return false for false config', () => {
      const store = new CacheStore();
      expect(store.isCacheable(false, 'GET')).toBe(false);
    });

    it('should return false for undefined config', () => {
      const store = new CacheStore();
      expect(store.isCacheable(undefined, 'GET')).toBe(false);
    });
  });
});
