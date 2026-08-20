/**
 * Browser-safe Stremio playback header sanitizer.
 *
 * Pure TypeScript — no Node.js imports. Mirrors the Phase 3D
 * sanitizePlaybackHeaders logic from playback-selector.service.ts.
 *
 * Applied to custom addon stream headers before they are passed to the player.
 * Server streams are already sanitized by Phase 3B before reaching the client.
 */

const ALLOWED_HEADER_KEYS = new Set(['referer', 'origin', 'accept', 'range']);

/** Literal private-range IP patterns for Referer/Origin URL hosts. */
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^::1$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(hostname));
}

function hasCrlf(value: string): boolean {
  return /[\r\n\0]/.test(value);
}

function isInternalUrl(rawUrl: string): boolean {
  try {
    const { hostname, protocol } = new URL(rawUrl);
    if (protocol !== 'http:' && protocol !== 'https:') return true;
    return isPrivateHost(hostname);
  } catch {
    return false; // Unparseable → not a URL, keep as-is
  }
}

/**
 * Sanitizes an arbitrary header map from a custom addon stream.
 *
 * Rules:
 *  1. Only allowlisted keys are kept (referer, origin, accept, range).
 *  2. Keys or values containing CRLF/NUL characters are stripped.
 *  3. Referer/Origin values pointing to private/loopback addresses are stripped.
 *
 * @returns A sanitized Record<string, string> safe to pass to the player.
 */
export function sanitizeStreamHeaders(
  raw: Record<string, string> | undefined
): Record<string, string> {
  if (!raw) return {};

  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(raw)) {
    const lowerKey = key.toLowerCase();

    if (!ALLOWED_HEADER_KEYS.has(lowerKey)) continue;
    if (hasCrlf(key) || hasCrlf(value)) continue;

    if (lowerKey === 'referer' || lowerKey === 'origin') {
      if (isInternalUrl(value)) continue;
    }

    result[lowerKey] = value;
  }

  return result;
}
