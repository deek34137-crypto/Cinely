interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface LruCacheOptions {
  maxSize?: number;
  defaultTtlMs?: number;
}

/**
 * Bounded, time-aware LRU cache using native Map key ordering.
 * Automatically evicts least recently accessed entries when maxSize is exceeded.
 */
export class LruCache<T> {
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;
  private cache = new Map<string, CacheEntry<T>>();

  constructor(options: LruCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 500;
    this.defaultTtlMs = options.defaultTtlMs ?? 5 * 60 * 1000; // 5 minutes default
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU order (delete & re-insert to move to tail)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // If key exists, delete first to update insertion position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first key in iteration order)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
