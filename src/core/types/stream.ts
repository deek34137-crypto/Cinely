/**
 * Normalized Stream Candidate Types & Schema Definitions for Cinely (Phase 3A)
 */

export type StreamProtocol = 'hls' | 'dash' | 'http' | 'torrent' | 'other';

export interface StreamBehaviorHints {
  notWebReady?: boolean;
  bingeGroup?: string;
  proxyHeaders?: Record<string, string>;
  filename?: string;
}

export interface StreamCandidate {
  id: string;                          // Deterministic ID: `${providerId}:${uniqueKey}`
  providerId: string;                  // e.g. "torrentio", "comet", "mediafusion"
  providerName: string;                // Human-readable name e.g. "Torrentio"
  name: string;                        // Short stream badge/title (e.g. "Torrentio\n1080p")
  title: string;                       // Full release title & details (e.g. "Inception.2010.1080p.BluRay.x264\n💾 2.4 GB 👤 140")
  url?: string;                        // Direct playback URL (HLS, DASH, MP4, or Debrid link)
  infoHash?: string;                   // Torrent infoHash if P2P/torrent
  fileIdx?: number;                    // Target file index inside torrent
  protocol: StreamProtocol;
  isWebPlayable: boolean;              // true if directly playable in browser HTML5 <video>
  quality: string;                     // "4K", "1080p", "720p", "480p", "unknown"
  resolution?: string;                 // "2160p", "1080p", "720p", "480p"
  codec?: string;                      // "HEVC", "x265", "x264", "AV1"
  audio?: string[];                    // e.g. ["5.1", "Atmos", "AAC"]
  sizeBytes?: number;                  // Parsed file size in bytes
  seeders?: number;                    // Parsed active seeders count (if torrent/P2P)
  behaviorHints?: StreamBehaviorHints;
  addonPriority: number;               // Addon priority order from user preferences (lower = higher priority)
  score: number;                       // Server-computed deterministic ranking score
}

export interface MediaStreamsResponse {
  mediaId: string;
  seasonNumber: number;
  episodeNumber: number;
  total: number;
  streams: StreamCandidate[];
}

export interface RawStremioStreamItem {
  name?: string;
  title?: string;
  url?: string;
  infoHash?: string;
  fileIdx?: number;
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    proxyHeaders?: Record<string, string>;
    filename?: string;
  };
  [key: string]: unknown;
}

export interface RawStremioStreamResponse {
  streams?: RawStremioStreamItem[];
  [key: string]: unknown;
}
