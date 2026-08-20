import { describe, it, expect, vi } from 'vitest';
import { Singleflight } from '../../src/core/utils/singleflight.js';

describe('Singleflight Concurrency Coordinator (Phase 3D)', () => {
  it('deduplicates concurrent calls for the same key into a single worker execution', async () => {
    const sf = new Singleflight<string>();
    let executionCount = 0;

    const worker = async () => {
      executionCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'resolved_payload';
    };

    // Dispatch 20 concurrent calls
    const results = await Promise.all(
      Array.from({ length: 20 }, () => sf.do('media:123', worker))
    );

    expect(executionCount).toBe(1);
    expect(results).toHaveLength(20);
    expect(results.every((r) => r === 'resolved_payload')).toBe(true);
    expect(sf.inFlightCount).toBe(0);
  });

  it('runs workers independently for different keys', async () => {
    const sf = new Singleflight<string>();
    let count = 0;

    const worker = async (val: string) => {
      count++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return val;
    };

    const [resA, resB] = await Promise.all([
      sf.do('key:A', () => worker('A')),
      sf.do('key:B', () => worker('B')),
    ]);

    expect(count).toBe(2);
    expect(resA).toBe('A');
    expect(resB).toBe('B');
  });

  it('propagates worker failure to all concurrent callers and clears in-flight entry', async () => {
    const sf = new Singleflight<string>();

    const failingWorker = async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      throw new Error('Network timeout');
    };

    const promises = Array.from({ length: 5 }, () =>
      sf.do('fail_key', failingWorker).catch((err) => err.message)
    );

    const errors = await Promise.all(promises);
    expect(errors.every((e) => e === 'Network timeout')).toBe(true);
    expect(sf.inFlightCount).toBe(0);

    // Subsequent call should be allowed to retry
    const successResult = await sf.do('fail_key', async () => 'recovered');
    expect(successResult).toBe('recovered');
  });
});
