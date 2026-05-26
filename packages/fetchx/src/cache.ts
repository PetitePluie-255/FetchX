import type { CacheConfig, CacheManager, HttpMethod } from './types';

interface CacheEntry<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timestamp: number;
  ttl: number;
}

export function createCacheKey(
  method: string,
  url: string,
  params?: Record<string, unknown>,
  body?: unknown
): string {
  const parts: string[] = [method.toLowerCase(), url];

  if (params && Object.keys(params).length > 0) {
    const sorted = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`);
    parts.push(`p:${sorted.join(',')}`);
  }

  if (body !== null && body !== undefined) {
    parts.push(`b:${stableStringify(body)}`);
  }

  return parts.join('|');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const record = value as Record<string, unknown>;
  return JSON.stringify(record, Object.keys(record).sort());
}

const DEFAULT_TTL = 60000;
const DEFAULT_MAX_SIZE = 100;
const DEFAULT_METHODS: HttpMethod[] = ['GET'];

export class CacheStore implements CacheManager {
  private store = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(config?: CacheConfig | false) {
    const cfg: CacheConfig | undefined = config === false ? undefined : config;
    this.maxSize = cfg?.maxSize ?? DEFAULT_MAX_SIZE;
  }

  isCacheable(
    config: CacheConfig | false | undefined,
    method: string
  ): boolean {
    if (config === false) return false;
    if (!config) return false;
    const methods = config.methods ?? DEFAULT_METHODS;
    return methods.includes(method.toUpperCase() as HttpMethod);
  }

  /**
   * Get the full cache entry including metadata (status, headers, etc.).
   * Used internally to reconstruct FetchXResponse on cache hits.
   * Not exposed on the public CacheManager interface.
   */
  getEntry(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return undefined;
    }

    // Move to end for LRU
    this.store.delete(key);
    this.store.set(key, entry);

    return entry;
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // TTL check
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return undefined;
    }

    // Move to end for LRU (delete + re-set)
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.data as T;
  }

  set(key: string, data: unknown, response: Response, ttl = DEFAULT_TTL): void {
    // Evict oldest if at capacity (before adding new)
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });

    this.store.set(key, {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
      timestamp: Date.now(),
      ttl,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  get size(): number {
    return this.store.size;
  }
}
