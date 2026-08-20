/**
 * Custom addon stream normalizer.
 *
 * Converts raw RawStremioStreamItem[] from a browser-side addon execution
 * into PlaybackSource[] using the same contract as Phase 3B server sources.
 *
 * The player receives PlaybackSource[] regardless of whether sources came
 * from Torrentio, Comet, MediaFusion, or a custom addon.
 *
 * Ranking invariant (enforced by useMergedPlayback):
 *   1. isWebPlayable DESC
 *   2. priorityOrder ASC  (from CustomAddonRecord)
 *   3. score DESC
 *   4. stableId ASC
 */

import { PlaybackSource, StreamProtocol, CustomAddonRecord } from '../types';
import { RawStremioStreamItem } from './browser-stremio-adapter';
import { sanitizeStreamHeaders } from '../stream/sanitize-headers';

// ─── Protocol classification ──────────────────────────────────────────────────

const HLS_PATTERNS = [/\.m3u8(\?|$)/i, /#EXTM3U/i];
const DASH_PATTERNS = [/\.mpd(\?|$)/i];
const DIRECT_VIDEO_PATTERNS = [/\.(mp4|mkv|avi|webm|mov|ts)(\?|$)/i];
const DIRECT_MIME_PATTERNS = ['video/'];

function classifyProtocol(url: string | undefined, infoHash: string | undefined): StreamProtocol {
  if (infoHash && !url) return 'torrent';
  if (!url) return 'other';
  if (HLS_PATTERNS.some((p) => p.test(url))) return 'hls';
  if (DASH_PATTERNS.some((p) => p.test(url))) return 'dash';
  if (
    DIRECT_VIDEO_PATTERNS.some((p) => p.test(url)) ||
    DIRECT_MIME_PATTERNS.some((p) => url.includes(p))
  )
    return 'http';
  return 'other';
}

function isWebPlayable(protocol: StreamProtocol): boolean {
  return protocol === 'hls' || protocol === 'dash' || protocol === 'http';
}

// ─── Quality / score extraction ───────────────────────────────────────────────

const RESOLUTION_RE = /(4k|2160p?|1080p?|720p?|480p?|360p?)/i;
const CODEC_RE = /\b(hevc|h\.?265|h\.?264|avc|vp9|av1|xvid)\b/i;

function extractResolution(text: string): string | undefined {
  const m = text.match(RESOLUTION_RE);
  if (!m) return undefined;
  const raw = m[1].toLowerCase();
  if (raw === '4k') return '2160p';
  return raw.endsWith('p') ? raw : `${raw}p`;
}

const RESOLUTION_SCORES: Record<string, number> = {
  '2160p': 4_000_000,
  '1080p': 3_000_000,
  '720p': 2_000_000,
  '480p': 1_000_000,
  '360p': 500_000,
};

function scoreFromResolution(resolution: string | undefined): number {
  return resolution ? (RESOLUTION_SCORES[resolution] ?? 0) : 0;
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

/**
 * Normalizes raw stream items from a custom browser-side addon to PlaybackSource[].
 *
 * Non-web-playable streams (e.g. torrent-only) are included so the caller can
 * filter or inform the user — isWebPlayable: false indicates browser cannot play.
 */
export function normalizeCustomAddonStreams(
  raw: RawStremioStreamItem[],
  addon: CustomAddonRecord,
  mediaId: string
): PlaybackSource[] {
  const results: PlaybackSource[] = [];

  raw.forEach((item, idx) => {
    const protocol = classifyProtocol(item.url, item.infoHash);
    const webPlayable = isWebPlayable(protocol);

    // Skip items with no URL and no infoHash (no usable stream reference)
    if (!item.url && !item.infoHash) return;

    // Torrent-only streams require a native client — not browser-playable
    // Include them but mark isWebPlayable: false so useMergedPlayback can exclude
    // them from the primary candidate list while still exposing them in alternatives
    const url = item.url ?? `magnet:?xt=urn:btih:${item.infoHash ?? ''}`;

    const title = item.title ?? item.name ?? '';
    const description = item.description ?? '';
    const combinedText = `${title} ${description}`;

    const resolution = extractResolution(combinedText);
    const codecMatch = combinedText.match(CODEC_RE);
    const codec = codecMatch ? codecMatch[1].toLowerCase() : undefined;

    const rawHeaders = {
      ...(item.behaviorHints?.proxyHeaders?.request ?? {}),
    } as Record<string, string>;

    const score = scoreFromResolution(resolution);

    const stableId = `${addon.id}:${mediaId}:${idx}`;

    results.push({
      id: stableId,
      providerId: addon.id,
      providerName: addon.manifest.name,
      name: title || addon.manifest.name,
      title: title || `Stream ${idx + 1}`,
      protocol,
      url,
      isWebPlayable: webPlayable && !(item.behaviorHints?.notWebReady === true),
      quality: resolution ?? 'Unknown',
      resolution,
      codec,
      headers: sanitizeStreamHeaders(rawHeaders),
      score,
    });
  });

  return results;
}
