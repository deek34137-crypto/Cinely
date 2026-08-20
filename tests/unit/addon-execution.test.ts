import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddonExecutionService, ExecutableAddon } from '../../src/core/addons/addon-execution.service.js';

describe('AddonExecutionService (Phase 3D Provider Boundary)', () => {
  let service: AddonExecutionService;

  const sampleAddonA: ExecutableAddon = {
    id: 'addon_a',
    name: 'Addon A',
    manifestUrl: 'https://a.com/manifest.json',
    priorityOrder: 1,
  };

  const sampleAddonB: ExecutableAddon = {
    id: 'addon_b',
    name: 'Addon B',
    manifestUrl: 'https://b.com/manifest.json',
    priorityOrder: 2,
  };

  beforeEach(() => {
    service = new AddonExecutionService();
    vi.restoreAllMocks();
  });

  it('executes multiple addons concurrently with Promise.allSettled isolation', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('a.com')) {
        return {
          ok: true,
          json: async () => ({
            streams: [{ name: 'A\n1080p', title: 'Stream A', url: 'https://a.com/play.m3u8' }],
          }),
        } as Response;
      }
      if (urlStr.includes('b.com')) {
        // Provider B returns empty
        return {
          ok: true,
          json: async () => ({ streams: [] }),
        } as Response;
      }
      return { ok: true, json: async () => ({ streams: [] }) } as Response;
    });

    const results = await service.executeAll(
      [sampleAddonA, sampleAddonB],
      { mediaKind: 'movie', targetId: 'tt1375666' }
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[0].rawStreams).toHaveLength(1);
    expect(results[1].success).toBe(true);

    // Health telemetry recorded
    const health = service.getHealthReport();
    expect(health).toHaveLength(2);
    const healthA = health.find((h) => h.providerId === 'addon_a')!;
    const healthB = health.find((h) => h.providerId === 'addon_b')!;
    expect(healthA.successCount).toBe(1);
    expect(healthA.consecutiveFailures).toBe(0);
    expect(healthB.successCount).toBe(1);
  });

  it('trips circuit to OPEN after 5 consecutive failures and blocks execution during cooldown', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

    // Trigger 5 failures
    for (let i = 0; i < 5; i++) {
      await service.executeAddon(sampleAddonA, { mediaKind: 'movie', targetId: 'tt1375666' });
    }

    const health = service.getHealthReport().find((h) => h.providerId === 'addon_a')!;
    expect(health.circuitState).toBe('OPEN');
    expect(health.consecutiveFailures).toBe(5);

    // 6th call should be short-circuited without making network call
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const shortCircuited = await service.executeAddon(sampleAddonA, { mediaKind: 'movie', targetId: 'tt1375666' });

    expect(shortCircuited.success).toBe(false);
    expect(shortCircuited.error).toContain('Circuit OPEN');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
