/**
 * Addon Health Engine & SLA Telemetry Types
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface AddonHealthReport {
  isHealthy: boolean;
  latencyMs: number;
  errorRatePercent: number;
  circuitState: CircuitState;
  message?: string;
  checkedAt: string;
}

export interface AddonSlaMetrics {
  addonId: string;
  windowSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  timeoutCount: number;
  errorCount: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  streamStallReports: number;
  healthScore: number;          // 0.00 to 1.00
  circuitState: CircuitState;
  lastUpdated: string;
}

export interface FallbackMetricsPayload {
  detectionLatencyMs: number;
  resolutionLatencyMs?: number;
  resumeLatencyMs?: number;
  positionDeltaSeconds?: number;
  errorCategory: string;
  httpStatus?: number | null;
  details?: string;
}
