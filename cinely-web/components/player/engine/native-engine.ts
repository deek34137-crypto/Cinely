import { PlaybackEngine, PlaybackEngineCallbacks } from './playback-engine';
import { PlaybackSource } from '../../../lib/types';

export class NativePlaybackEngine implements PlaybackEngine {
  public readonly protocol = 'native';
  private video: HTMLVideoElement | null = null;
  private callbacks: PlaybackEngineCallbacks;
  private isDestroyed = false;
  private retryCount = 0;
  private maxRetries = 1;
  private currentSource: PlaybackSource | null = null;
  private initialPosition = 0;

  // Bound event handlers for clean removal
  private handlePlaying = () => {
    this.callbacks.onBuffering?.(false);
    this.callbacks.onPlaying?.();
  };

  private handlePause = () => {
    this.callbacks.onPaused?.();
  };

  private handleWaiting = () => {
    this.callbacks.onBuffering?.(true);
  };

  private handleTimeUpdate = () => {
    if (!this.video) return;
    this.callbacks.onTimeUpdate?.(this.video.currentTime, this.video.duration || 0);
  };

  private handleEnded = () => {
    this.callbacks.onEnded?.();
  };

  private handleLoadedMetadata = () => {
    if (!this.video || this.isDestroyed) return;
    const duration = this.video.duration || 0;
    this.callbacks.onLoadedMetadata?.(duration);

    if (this.initialPosition > 0 && duration > 0) {
      const safePosition = Math.min(this.initialPosition, Math.max(0, duration - 10));
      this.video.currentTime = safePosition;
      this.initialPosition = 0;
    }
  };

  private handleError = () => {
    if (!this.video || this.isDestroyed) return;
    const mediaError = this.video.error;
    const errorCode = mediaError?.code;
    const errorMessage = mediaError?.message || 'HTML5 Media Playback Error';

    // Distinguish fatal errors (unsupported format, decode error, permanent 404/403) from transient network stalls
    const isFatal =
      errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
      errorCode === MediaError.MEDIA_ERR_DECODE ||
      this.retryCount >= this.maxRetries;

    if (!isFatal && this.retryCount < this.maxRetries) {
      this.retryCount++;
      // Transient error: attempt one reload of the current source
      if (this.video && this.currentSource) {
        const savedTime = this.video.currentTime || 0;
        this.video.src = this.currentSource.url;
        this.video.currentTime = savedTime;
        this.video.load();
        this.video.play().catch(() => {});
        return;
      }
    }

    this.callbacks.onError?.(new Error(`${errorMessage} (Code ${errorCode})`), isFatal);
  };

  constructor(callbacks: PlaybackEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async attach(video: HTMLVideoElement, source: PlaybackSource, initialPosition = 0): Promise<void> {
    this.destroy(); // Clean any previous attachment
    this.isDestroyed = false;
    this.video = video;
    this.currentSource = source;
    this.initialPosition = initialPosition;
    this.retryCount = 0;

    // Attach native DOM event listeners
    video.addEventListener('playing', this.handlePlaying);
    video.addEventListener('pause', this.handlePause);
    video.addEventListener('waiting', this.handleWaiting);
    video.addEventListener('timeupdate', this.handleTimeUpdate);
    video.addEventListener('ended', this.handleEnded);
    video.addEventListener('loadedmetadata', this.handleLoadedMetadata);
    video.addEventListener('error', this.handleError);

    // Apply direct video source
    video.src = source.url;
    video.load();
  }

  async play(): Promise<void> {
    if (!this.video || this.isDestroyed) return;
    return this.video.play();
  }

  pause(): void {
    if (!this.video || this.isDestroyed) return;
    this.video.pause();
  }

  seek(timeSeconds: number): void {
    if (!this.video || this.isDestroyed) return;
    this.video.currentTime = Math.max(0, timeSeconds);
  }

  setVolume(volume: number): void {
    if (!this.video || this.isDestroyed) return;
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  setPlaybackRate(rate: number): void {
    if (!this.video || this.isDestroyed) return;
    this.video.playbackRate = rate;
  }

  destroy(): void {
    this.isDestroyed = true;
    if (!this.video) return;

    this.video.removeEventListener('playing', this.handlePlaying);
    this.video.removeEventListener('pause', this.handlePause);
    this.video.removeEventListener('waiting', this.handleWaiting);
    this.video.removeEventListener('timeupdate', this.handleTimeUpdate);
    this.video.removeEventListener('ended', this.handleEnded);
    this.video.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
    this.video.removeEventListener('error', this.handleError);

    try {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
    } catch {
      // Ignore cleanup edge cases
    }

    this.video = null;
    this.currentSource = null;
  }
}
