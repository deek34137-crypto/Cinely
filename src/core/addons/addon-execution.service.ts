import { RawStremioStreamItem } from '../types/stream.js';
import { fetchStremioStreams } from './stremio-adapter.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ProviderHealth {
  providerId: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  avgLatencyMs: number;
  circuitState: CircuitState;
  lastFailureAt?: number;
  lastSuccessAt?: number;
}

export interface ExecutableAddon {
  id: string;
  name: string;
  manifestUrl: string;
  priorityOrder: number;
  configuration?: Record<string, unknown>;
}

export interface StremioExecutionCoordinates {
  mediaKind: 'movie' | 'series';
  targetId: string;
}

export interface AddonExecutionResult {
  addon: ExecutableAddon;
  rawStreams: RawStremioStreamItem[];
  latencyMs: number;
  success: boolean;
  error?: string;
}

export class AddonExecutionService {
  private healthMap = new Map<string, ProviderHealth>();
  private readonly failureThreshold = 5; // Trip circuit after 5 consecutive failures
  private readonly cooldownMs = 30_000; // 30s cooldown for tripped circuit

  private getOrCreateHealth(providerId: string): ProviderHealth {
    let health = this.healthMap.get(providerId);
    if (!health) {
      health = {
        providerId,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        avgLatencyMs: 0,
        circuitState: 'CLOSED',
      };
      this.healthMap.set(providerId, health);
    }
    return health;
  }

  /**
   * Checks if provider is available to execute or temporarily throttled by circuit breaker.
   */
  private isProviderExecutable(health: ProviderHealth): boolean {
    if (health.circuitState === 'CLOSED') return true;

    if (health.circuitState === 'OPEN') {
      const now = Date.now();
      if (health.lastFailureAt && now - health.lastFailureAt > this.cooldownMs) {
        health.circuitState = 'HALF_OPEN';
        return true;
      }
      return false; // In cooldown
    }

    // HALF_OPEN allows probe
    return true;
  }

  private recordSuccess(health: ProviderHealth, latencyMs: number) {
    health.totalRequests++;
    health.successCount++;
    health.consecutiveFailures = 0;
    health.circuitState = 'CLOSED';
    health.lastSuccessAt = Date.now();
    health.avgLatencyMs = Math.round(
      (health.avgLatencyMs * (health.successCount - 1) + latencyMs) / health.successCount
    );
  }

  private recordFailure(health: ProviderHealth, _latencyMs: number) {
    health.totalRequests++;
    health.failureCount++;
    health.consecutiveFailures++;
    health.lastFailureAt = Date.now();

    if (health.consecutiveFailures >= this.failureThreshold) {
      health.circuitState = 'OPEN';
    }
  }

  /**
   * Executes a single addon with timeout isolation and circuit breaker protection.
   */
  async executeAddon(
    addon: ExecutableAddon,
    coordinates: StremioExecutionCoordinates,
    timeoutMs = 5000
  ): Promise<AddonExecutionResult> {
    const health = this.getOrCreateHealth(addon.id);

    if (!this.isProviderExecutable(health)) {
      return {
        addon,
        rawStreams: [],
        latencyMs: 0,
        success: false,
        error: `Circuit OPEN for ${addon.name} (temporary cooldown)`,
      };
    }

    const startTime = Date.now();
    try {
      const rawStreams = await fetchStremioStreams(
        addon.manifestUrl,
        coordinates.mediaKind,
        coordinates.targetId,
        { configuration: addon.configuration, timeoutMs, throwOnError: true }
      );
      const latency = Date.now() - startTime;
      this.recordSuccess(health, latency);

      return {
        addon,
        rawStreams: rawStreams || [],
        latencyMs: latency,
        success: true,
      };
    } catch (err: any) {
      const latency = Date.now() - startTime;
      this.recordFailure(health, latency);

      return {
        addon,
        rawStreams: [],
        latencyMs: latency,
        success: false,
        error: err?.message || 'Addon execution failed',
      };
    }
  }

  /**
   * Concurrently executes all enabled addons in parallel.
   * Tolerates individual timeouts or network failures without failing the overall batch.
   */
  async executeAll(
    addons: ExecutableAddon[],
    coordinates: StremioExecutionCoordinates,
    timeoutMs = 5000
  ): Promise<AddonExecutionResult[]> {
    const promises = addons.map((addon) =>
      this.executeAddon(addon, coordinates, timeoutMs)
    );

    const settled = await Promise.allSettled(promises);
    return settled.map((s, idx) => {
      if (s.status === 'fulfilled') {
        return s.value;
      }
      return {
        addon: addons[idx],
        rawStreams: [],
        latencyMs: 0,
        success: false,
        error: s.reason?.message || 'Execution failed',
      };
    });
  }

  /**
   * Returns current health telemetry for all observed providers.
   */
  getHealthReport(): ProviderHealth[] {
    return Array.from(this.healthMap.values());
  }

  /**
   * Resets health metrics (useful for testing).
   */
  resetHealth(): void {
    this.healthMap.clear();
  }
}

export const sharedAddonExecutionService = new AddonExecutionService();

