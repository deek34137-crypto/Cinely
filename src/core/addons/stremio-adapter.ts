import { RawStremioStreamResponse, RawStremioStreamItem } from '../types/stream.js';

export interface StremioFetchOptions {
  timeoutMs?: number;
  configuration?: Record<string, unknown>;
  throwOnError?: boolean;
}

/**
 * Builds the Stremio stream URL according to the official Stremio Addon Protocol specification:
 * Base URL: `[manifestBase]/[config?]/stream/[type]/[id].json`
 * 
 * - Movie id: `tt1375666`
 * - Series id: `tt0903747:1:3` (imdbId:season:episode)
 */
export function buildStremioStreamUrl(
  manifestUrl: string,
  mediaKind: 'movie' | 'series',
  targetId: string,
  configuration?: Record<string, unknown>
): string {
  // Strip manifest.json from base
  let baseUrl = manifestUrl.trim();
  if (baseUrl.endsWith('/manifest.json')) {
    baseUrl = baseUrl.slice(0, -'/manifest.json'.length);
  }
  baseUrl = baseUrl.replace(/\/+$/, '');

  let configSegment = '';
  if (configuration && Object.keys(configuration).length > 0) {
    // If configuration is key-value pairs (like Torrentio/Comet config formats)
    // or standard JSON, format appropriately
    const keys = Object.keys(configuration);
    const isKeyValue = keys.every(k => typeof configuration[k] === 'string' || typeof configuration[k] === 'number');
    if (isKeyValue) {
      configSegment = keys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(configuration[k]))}`).join('|');
    } else {
      configSegment = encodeURIComponent(JSON.stringify(configuration));
    }
  }

  const streamType = mediaKind === 'series' ? 'series' : 'movie';
  const encodedId = encodeURIComponent(targetId);

  return configSegment
    ? `${baseUrl}/${configSegment}/stream/${streamType}/${encodedId}.json`
    : `${baseUrl}/stream/${streamType}/${encodedId}.json`;
}

/**
 * Fetches stream candidates from a Stremio addon with strict timeout and error isolation.
 * When throwOnError is false (default), returns empty list on network or parse failure.
 */
export async function fetchStremioStreams(
  manifestUrl: string,
  mediaKind: 'movie' | 'series',
  targetId: string,
  options: StremioFetchOptions = {}
): Promise<RawStremioStreamItem[]> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const throwOnError = options.throwOnError ?? false;
  const url = buildStremioStreamUrl(manifestUrl, mediaKind, targetId, options.configuration);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Cinely-Media-Engine/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (throwOnError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return [];
    }

    const json = (await response.json()) as RawStremioStreamResponse;
    if (!json || typeof json !== 'object' || !Array.isArray(json.streams)) {
      if (throwOnError && (!json || typeof json !== 'object')) {
        throw new Error('Invalid JSON stream response from addon');
      }
      return [];
    }

    return json.streams;
  } catch (err) {
    if (throwOnError) throw err;
    // Catch AbortError, NetworkError, JSON parse errors cleanly
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
