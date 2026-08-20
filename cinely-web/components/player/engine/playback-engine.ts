import { PlaybackSource } from '../../../lib/types';

export interface PlaybackEngineCallbacks {
  onPlaying?: () => void;
  onPaused?: () => void;
  onBuffering?: (isBuffering: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error, isFatal: boolean) => void;
  onLoadedMetadata?: (duration: number) => void;
}

export interface PlaybackEngine {
  readonly protocol: string;
  attach(video: HTMLVideoElement, source: PlaybackSource, initialPosition?: number): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(timeSeconds: number): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}
