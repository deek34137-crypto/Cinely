import { PlaybackEngine, PlaybackEngineCallbacks } from './playback-engine';
import { PlaybackSource } from '../../../lib/types';
import { NativePlaybackEngine } from './native-engine';

export class HlsPlaybackEngine implements PlaybackEngine {
  public readonly protocol = 'hls';
  private video: HTMLVideoElement | null = null;
  private nativeEngine: NativePlaybackEngine | null = null;
  private hlsInstance: any = null;
  private callbacks: PlaybackEngineCallbacks;
  private isDestroyed = false;
  private retryCount = 0;
  private maxRetries = 1;

  constructor(callbacks: PlaybackEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async attach(video: HTMLVideoElement, source: PlaybackSource, initialPosition = 0): Promise<void> {
    this.destroy();
    this.isDestroyed = false;
    this.video = video;
    this.retryCount = 0;

    // Check if Safari / iOS supports native HLS playback directly
    const canPlayNativeHls = video.canPlayType('application/vnd.apple.mpegurl');
    if (canPlayNativeHls === 'probably' || canPlayNativeHls === 'maybe') {
      this.nativeEngine = new NativePlaybackEngine(this.callbacks);
      await this.nativeEngine.attach(video, source, initialPosition);
      return;
    }

    // Try dynamic HLS.js if available in the environment
    try {
      const HlsModule = await import('hls.js');
      const Hls = HlsModule.default || HlsModule;

      if (Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          xhrSetup: (xhr: XMLHttpRequest) => {
            if (source.headers) {
              for (const [key, val] of Object.entries(source.headers)) {
                try { xhr.setRequestHeader(key, val); } catch {}
              }
            }
          },
        });

        this.hlsInstance = hls;

        hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
          if (this.isDestroyed) return;
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && this.retryCount < this.maxRetries) {
              this.retryCount++;
              hls.startLoad();
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && this.retryCount < this.maxRetries) {
              this.retryCount++;
              hls.recoverMediaError();
              return;
            }
            // Fatal unrecoverable HLS error -> trigger failover
            this.callbacks.onError?.(new Error(`HLS Fatal Error: ${data.details}`), true);
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (this.isDestroyed || !this.video) return;
          if (initialPosition > 0) {
            this.video.currentTime = initialPosition;
          }
        });

        // Attach native playback event listeners
        this.nativeEngine = new NativePlaybackEngine(this.callbacks);
        // Attach DOM listeners without setting video.src directly
        video.addEventListener('playing', () => this.callbacks.onPlaying?.());
        video.addEventListener('pause', () => this.callbacks.onPaused?.());
        video.addEventListener('waiting', () => this.callbacks.onBuffering?.(true));
        video.addEventListener('timeupdate', () => {
          if (this.video) this.callbacks.onTimeUpdate?.(this.video.currentTime, this.video.duration || 0);
        });
        video.addEventListener('ended', () => this.callbacks.onEnded?.());

        hls.loadSource(source.url);
        hls.attachMedia(video);
        return;
      }
    } catch {
      // HLS.js not installed or failed to initialize — fallback to native video attempt
    }

    // Fallback to Native Engine
    this.nativeEngine = new NativePlaybackEngine(this.callbacks);
    await this.nativeEngine.attach(video, source, initialPosition);
  }

  async play(): Promise<void> {
    if (this.nativeEngine) return this.nativeEngine.play();
    if (this.video) return this.video.play();
  }

  pause(): void {
    if (this.nativeEngine) this.nativeEngine.pause();
    else if (this.video) this.video.pause();
  }

  seek(timeSeconds: number): void {
    if (this.nativeEngine) this.nativeEngine.seek(timeSeconds);
    else if (this.video) this.video.currentTime = timeSeconds;
  }

  setVolume(volume: number): void {
    if (this.nativeEngine) this.nativeEngine.setVolume(volume);
    else if (this.video) this.video.volume = volume;
  }

  setPlaybackRate(rate: number): void {
    if (this.nativeEngine) this.nativeEngine.setPlaybackRate(rate);
    else if (this.video) this.video.playbackRate = rate;
  }

  destroy(): void {
    this.isDestroyed = true;

    if (this.hlsInstance) {
      try {
        this.hlsInstance.detachMedia();
        this.hlsInstance.destroy();
      } catch {}
      this.hlsInstance = null;
    }

    if (this.nativeEngine) {
      this.nativeEngine.destroy();
      this.nativeEngine = null;
    }

    this.video = null;
  }
}
