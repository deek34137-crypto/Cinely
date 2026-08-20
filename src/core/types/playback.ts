import { StreamProtocol } from './stream.js';
import { MediaKind } from './media.js';

export interface PlaybackSource {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  title: string;
  protocol: StreamProtocol;
  url: string;
  isWebPlayable: boolean;
  quality: string;
  resolution?: string;
  codec?: string;
  audio?: string[];
  sizeBytes?: number;
  headers?: Record<string, string>;
  score: number;
}

export interface PlaybackResponse {
  mediaId: string;
  mediaKind: MediaKind;
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  selected: PlaybackSource | null;
  alternatives: PlaybackSource[];
  totalPlayable: number;
  hasPlayableSource: boolean;
}
