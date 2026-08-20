import { describe, it, expect, vi } from 'vitest';
import { LruCache } from '../../src/core/utils/lru-cache.js';

describe('Bounded LRU Cache (Phase 3D)', () => {
  it('stores and retrieves cached values within TTL', () => {
    const cache = new LruCache<string>({ maxSize: 3, defaultTtlMs: 1000 });
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');

    expect(cache.get('k1')).toBe('v1');
    expect(cache.get('k2')).toBe('v2');
    expect(cache.size).toBe(2);
  });

  it('evicts oldest accessed entry when maxSize is reached', () => {
    const cache = new LruCache<string>({ maxSize: 3 });
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');

    // Access k1 so k2 becomes the least recently used
    expect(cache.get('k1')).toBe('v1');

    // Insert 4th item -> should evict k2
    cache.set('k4', 'v4');

    expect(cache.size).toBe(3);
    expect(cache.get('k1')).toBe('v1');
    expect(cache.get('k2')).toBeUndefined();
    expect(cache.get('k3')).toBe('v3');
    expect(cache.get('k4')).toBe('v4');
  });

  it('expires entries after TTL', async () => {
    const cache = new LruCache<string>({ defaultTtlMs: 50 });
    cache.set('quick', 'val');

    expect(cache.get('quick')).toBe('val');

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(cache.get('quick')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('clears all entries upon clear()', () => {
    const cache = new LruCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});
