import { StreamCandidate } from '../types/stream.js';
import { PlaybackSource, PlaybackResponse } from '../types/playback.js';
import { MediaKind } from '../types/media.js';

/**
 * Strict allowlist of client-safe HTTP headers for browser playback.
 * Sensitive headers (User-Agent, Authorization, Cookie, Proxy-Authorization, X-API-Key) are strictly stripped.
 */
export const ALLOWED_PLAYBACK_HEADERS = new Set([
  'referer',
  'origin',
  'accept',
  'range',
]);

/**
 * Validates whether a URL or origin value points to an internal/private/loopback address.
 */
export function isInternalAddress(val: string): boolean {
  try {
    const url = new URL(val);
    const hostname = url.hostname.toLowerCase();

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return true;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    return false;
  } catch {
    // If not a parseable URL, reject if it looks like an internal IP/domain string
    const lower = val.toLowerCase().trim();
    return (
      lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('169.254.') ||
      lower.includes('10.') ||
      lower.includes('192.168.')
    );
  }
}

/**
 * Sanitizes headers from addon behaviorHints.proxyHeaders against the strict allowlist,
 * CRLF injection, and SSRF/intranet destinations.
 */
export function sanitizePlaybackHeaders(
  rawHeaders?: Record<string, string>
): Record<string, string> | undefined {
  if (!rawHeaders || typeof rawHeaders !== 'object') {
    return undefined;
  }

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (typeof value !== 'string') continue;

    const normalizedKey = key.toLowerCase().trim();

    // 1. CRLF / control characters defense
    if (/[\r\n\0]/.test(key) || /[\r\n\0]/.test(value)) {
      continue;
    }

    // 2. Strict allowlist
    if (!ALLOWED_PLAYBACK_HEADERS.has(normalizedKey)) {
      continue;
    }

    // 3. SSRF & private network address defense for Referer and Origin
    if (normalizedKey === 'referer' || normalizedKey === 'origin') {
      if (isInternalAddress(value)) {
        continue;
      }
    }

    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Maps a verified web-playable StreamCandidate to a client-facing PlaybackSource.
 */
export function mapCandidateToPlaybackSource(candidate: StreamCandidate): PlaybackSource {
  return {
    id: candidate.id,
    providerId: candidate.providerId,
    providerName: candidate.providerName,
    name: candidate.name,
    title: candidate.title,
    protocol: candidate.protocol,
    url: candidate.url!,
    isWebPlayable: candidate.isWebPlayable,
    quality: candidate.quality,
    resolution: candidate.resolution,
    codec: candidate.codec,
    audio: candidate.audio,
    sizeBytes: candidate.sizeBytes,
    headers: sanitizePlaybackHeaders(candidate.behaviorHints?.proxyHeaders),
    score: candidate.score,
  };
}

/**
 * Selects the optimal browser-ready stream source from Phase 3A's pre-ranked candidates.
 * Preserves the exact ranking order established by Phase 3A without secondary re-ranking.
 */
export function selectPlaybackSource(
  candidates: StreamCandidate[],
  media: { id: string; mediaKind: MediaKind; title: string },
  coordinates: { seasonNumber: number; episodeNumber: number }
): PlaybackResponse {
  // Filter for valid browser-playable streams with non-empty URLs
  const playableCandidates = candidates.filter(
    (c) => c.isWebPlayable && typeof c.url === 'string' && c.url.trim().length > 0
  );

  const playableSources = playableCandidates.map(mapCandidateToPlaybackSource);

  const selected = playableSources[0] || null;
  const alternatives = playableSources.slice(1);

  return {
    mediaId: media.id,
    mediaKind: media.mediaKind,
    title: media.title,
    seasonNumber: coordinates.seasonNumber,
    episodeNumber: coordinates.episodeNumber,
    selected,
    alternatives,
    totalPlayable: playableSources.length,
    hasPlayableSource: selected !== null,
  };
}
