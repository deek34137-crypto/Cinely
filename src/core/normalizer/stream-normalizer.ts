import crypto from 'crypto';
import { RawStremioStreamItem, StreamCandidate, StreamProtocol } from '../types/stream.js';

/**
 * Parses file size string (e.g. "2.4 GB", "850 MB") into bytes.
 */
export function parseSizeBytes(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(GB|GiB|MB|MiB|TB|TiB|KB|KiB)/i);
  if (!match) return undefined;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  switch (unit) {
    case 'TB':
    case 'TIB':
      return Math.round(value * 1024 * 1024 * 1024 * 1024);
    case 'GB':
    case 'GIB':
      return Math.round(value * 1024 * 1024 * 1024);
    case 'MB':
    case 'MIB':
      return Math.round(value * 1024 * 1024);
    case 'KB':
    case 'KIB':
      return Math.round(value * 1024);
    default:
      return undefined;
  }
}

/**
 * Parses active seeders count from stream description text (e.g. "👤 140", "seeds: 25").
 */
export function parseSeeders(text: string): number | undefined {
  const match = text.match(/(?:👤|seeds?:\s*|seeders?:\s*)\s*(\d+)/i);
  if (!match) return undefined;
  const count = parseInt(match[1], 10);
  return isNaN(count) ? undefined : count;
}

/**
 * Extracts resolution and standard quality label.
 */
export function extractResolution(text: string): { quality: string; resolution?: string } {
  if (/4k|2160p|uhd/i.test(text)) {
    return { quality: '4K', resolution: '2160p' };
  }
  if (/1080p|fhd/i.test(text)) {
    return { quality: '1080p', resolution: '1080p' };
  }
  if (/720p|hd/i.test(text)) {
    return { quality: '720p', resolution: '720p' };
  }
  if (/480p|576p|sd/i.test(text)) {
    return { quality: '480p', resolution: '480p' };
  }
  return { quality: 'unknown', resolution: undefined };
}

/**
 * Extracts video codec from text.
 */
export function extractCodec(text: string): string | undefined {
  if (/hevc|x265|h\.?265/i.test(text)) return 'HEVC';
  if (/avc|x264|h\.?264/i.test(text)) return 'x264';
  if (/av1/i.test(text)) return 'AV1';
  if (/vp9/i.test(text)) return 'VP9';
  return undefined;
}

/**
 * Extracts audio channel metadata.
 */
export function extractAudio(text: string): string[] {
  const audio: string[] = [];
  if (/atmos/i.test(text)) audio.push('Atmos');
  if (/7\.1/i.test(text)) audio.push('7.1');
  if (/5\.1|ddp5\.1|dd5\.1/i.test(text)) audio.push('5.1');
  if (/dts-hd|dts/i.test(text)) audio.push('DTS');
  if (/aac/i.test(text)) audio.push('AAC');
  return audio;
}

/**
 * Determines stream protocol and browser web playability.
 * 
 * Strict policy:
 * - HLS (.m3u8), DASH (.mpd), and direct web-ready MP4/HTTP streams -> isWebPlayable: true
 * - Raw P2P torrents (infoHash) or streams flagged with notWebReady: true -> isWebPlayable: false
 */
export function classifyProtocolAndPlayability(item: RawStremioStreamItem): {
  protocol: StreamProtocol;
  isWebPlayable: boolean;
} {
  const infoHash = typeof item.infoHash === 'string' ? item.infoHash : undefined;
  const url = typeof item.url === 'string' ? item.url : undefined;

  if (infoHash) {
    return { protocol: 'torrent', isWebPlayable: false };
  }

  if (url) {
    const lowerUrl = url.toLowerCase();
    const notWebReady = item.behaviorHints?.notWebReady === true;

    if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls/')) {
      return { protocol: 'hls', isWebPlayable: !notWebReady };
    }
    if (lowerUrl.includes('.mpd') || lowerUrl.includes('/dash/')) {
      return { protocol: 'dash', isWebPlayable: !notWebReady };
    }
    if (lowerUrl.endsWith('.mkv') || notWebReady) {
      return { protocol: 'http', isWebPlayable: false };
    }
    // Direct MP4 or HTTP/HTTPS stream without notWebReady flag
    return { protocol: 'http', isWebPlayable: true };
  }

  return { protocol: 'other', isWebPlayable: false };
}

/**
 * Normalizes a raw Stremio stream item into a deterministic Cinely StreamCandidate.
 */
export function normalizeStremioStream(
  item: RawStremioStreamItem,
  providerId: string,
  providerName: string,
  addonPriority: number
): StreamCandidate {
  const safeName = typeof item.name === 'string' ? item.name : '';
  const safeTitle = typeof item.title === 'string' ? item.title : '';
  const safeUrl = typeof item.url === 'string' ? item.url : '';
  const safeInfoHash = typeof item.infoHash === 'string' ? item.infoHash : '';

  const combinedText = `${safeName} ${safeTitle} ${safeUrl}`;

  const { quality, resolution } = extractResolution(combinedText);
  const codec = extractCodec(combinedText);
  const audio = extractAudio(combinedText);
  const sizeBytes = parseSizeBytes(combinedText);
  const seeders = parseSeeders(combinedText);
  const { protocol, isWebPlayable } = classifyProtocolAndPlayability(item);

  // Generate deterministic ID
  const seedKey = `${providerId}:${safeUrl || safeInfoHash || safeTitle || ''}:${item.fileIdx ?? 0}`;
  const hash = crypto.createHash('sha256').update(seedKey).digest('hex').slice(0, 16);

  const id = `cinely:str:${providerId}:${hash}`;

  return {
    id,
    providerId,
    providerName,
    name: item.name?.trim() || providerName,
    title: item.title?.trim() || item.name?.trim() || `${providerName} Stream`,
    url: item.url,
    infoHash: item.infoHash,
    fileIdx: item.fileIdx,
    protocol,
    isWebPlayable,
    quality,
    resolution,
    codec,
    audio: audio.length > 0 ? audio : undefined,
    sizeBytes,
    seeders,
    behaviorHints: item.behaviorHints,
    addonPriority,
    score: 0, // Computed by StreamRanker
  };
}
