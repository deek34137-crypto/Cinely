/**
 * Browser-side Stremio stream adapter.
 *
 * Fetches raw stream items from a custom addon's /stream/{type}/{id}.json
 * endpoint entirely within the user's browser. The Cinely backend is never
 * contacted for custom addon stream requests.
 *
 * The Stremio ID (e.g. "tt1375666" or "tt0903747:1:3") must be pre-resolved
 * by the caller from NormalizedMediaDetail.externalIds — this adapter is a
 * dumb protocol client only.
 */

import { CustomAddonRecord, CustomAddonErrorKind } from '../types';

/** Raw stream object returned by a Stremio addon endpoint. */
export interface RawStremioStreamItem {
  url?: string;
  infoHash?: string;
  fileIdx?: number;
  title?: string;
  name?: string;
  description?: string;
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    proxyHeaders?: {
      request?: Record<string, string>;
      response?: Record<string, string>;
    };
  };
}

export class CustomAddonFetchError extends Error {
  constructor(
    public readonly kind: CustomAddonErrorKind,
    message: string,
    public readonly addonId: string,
    public readonly addonName: string
  ) {
    super(message);
    this.name = 'CustomAddonFetchError';
  }
}

const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 10_000;

function classifyFetchError(err: unknown, addonId: string, addonName: string): CustomAddonFetchError {
  if ((err as Error)?.name === 'AbortError') {
    return new CustomAddonFetchError('TIMEOUT', 'Request timed out.', addonId, addonName);
  }
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed')
    ) {
      return new CustomAddonFetchError(
        'CORS_BLOCKED',
        'Addon stream request was blocked — the addon server likely does not allow browser access (CORS).',
        addonId,
        addonName
      );
    }
  }
  return new CustomAddonFetchError(
    'UNKNOWN',
    `Unexpected error: ${(err as Error)?.message ?? String(err)}`,
    addonId,
    addonName
  );
}

export interface BrowserStremioAdapterOptions {
  /** Timeout in milliseconds. Clamped to [1000, MAX_TIMEOUT_MS]. Default: 5000. */
  timeoutMs?: number;
}

/**
 * Fetches stream items from a custom Stremio addon for the given media coordinates.
 *
 * @param addon - The installed custom addon record.
 * @param mediaType - Stremio media type: "movie" or "series".
 * @param stremioId - Pre-resolved Stremio ID:
 *   - Movie:  "tt1375666"
 *   - Series: "tt0903747:1:3"
 *   Resolved by caller from NormalizedMediaDetail.externalIds.imdbId.
 * @throws CustomAddonFetchError on CORS, timeout, or unknown network errors.
 *   HTTP non-2xx responses return [] (addon has no results for this ID).
 */
export async function fetchCustomAddonStreams(
  addon: CustomAddonRecord,
  mediaType: 'movie' | 'series',
  stremioId: string,
  options: BrowserStremioAdapterOptions = {}
): Promise<RawStremioStreamItem[]> {
  const timeoutMs = Math.min(
    Math.max(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1000),
    MAX_TIMEOUT_MS
  );

  // Mixed-content guard: warn if http addon on https page (browser will likely block anyway)
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    addon.manifestUrl.startsWith('http://')
  ) {
    throw new CustomAddonFetchError(
      'MIXED_CONTENT',
      'Cannot load streams from an HTTP addon while on an HTTPS page (mixed-content restriction).',
      addon.id,
      addon.manifest.name
    );
  }

  // Build stream URL from manifest base
  const base = addon.manifestUrl.replace(/\/manifest\.json$/i, '').replace(/\/+$/, '');
  const streamUrl = `${base}/stream/${mediaType}/${encodeURIComponent(stremioId)}.json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(streamUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      // Non-2xx: addon has no results for this title, not a hard error
      return [];
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return [];
    }

    if (
      typeof json !== 'object' ||
      json === null ||
      !Array.isArray((json as Record<string, unknown>).streams)
    ) {
      return [];
    }

    return (json as { streams: RawStremioStreamItem[] }).streams;
  } catch (err) {
    throw classifyFetchError(err, addon.id, addon.manifest.name);
  } finally {
    clearTimeout(timer);
  }
}
