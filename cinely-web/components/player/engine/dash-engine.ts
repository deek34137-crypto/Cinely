import { PlaybackEngine, PlaybackEngineCallbacks } from './playback-engine';
import { PlaybackSource } from '../../../lib/types';
import { NativePlaybackEngine } from './native-engine';

export class DashPlaybackEngine implements PlaybackEngine {
  public readonly protocol = 'dash';
  private video: HTMLVideoElement | null = null;
  private nativeEngine: NativePlaybackEngine | null = null;
  private dashInstance: any = null;
  private callbacks: PlaybackEngineCallbacks;
  private isDestroyed = false;

  constructor(callbacks: PlaybackEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async attach(video: HTMLVideoElement, source: PlaybackSource, initialPosition = 0): Promise<void> {
    this.destroy();
    this.isDestroyed = false;
    this.video = video;

    const globalDash = typeof window !== 'undefined' ? (window as any).dashjs : null;
    if (globalDash && typeof globalDash.MediaPlayer === 'function') {
      try {
        const player = globalDash.MediaPlayer().create();
        this.dashInstance = player;

        player.on('error', (e: any) => {
          if (this.isDestroyed) return;
          this.callbacks.onError?.(new Error(`DASH Fatal Error: ${e.error?.message || e.error}`), true);
        });

        player.initialize(video, source.url, true, initialPosition);
        return;
      } catch {
        // Fall back to native
      }
    }

    this.nativeEngine = new NativePlaybackEngine(this.callbacks);
    await this.nativeEngine.attach(video, source, initialPosition);
  }

  async play(): Promise<void> {
    if (this.dashInstance) return this.dashInstance.play();
    if (this.nativeEngine) return this.nativeEngine.play();
    if (this.video) return this.video.play();
  }

  pause(): void {
    if (this.dashInstance) this.dashInstance.pause();
    else if (this.nativeEngine) this.nativeEngine.pause();
    else if (this.video) this.video.pause();
  }

  seek(timeSeconds: number): void {
    if (this.dashInstance) this.dashInstance.seek(timeSeconds);
    else if (this.nativeEngine) this.nativeEngine.seek(timeSeconds);
    else if (this.video) this.video.currentTime = timeSeconds;
  }

  setVolume(volume: number): void {
    if (this.dashInstance) this.dashInstance.setVolume(volume);
    else if (this.nativeEngine) this.nativeEngine.setVolume(volume);
    else if (this.video) this.video.volume = volume;
  }

  setPlaybackRate(rate: number): void {
    if (this.dashInstance) this.dashInstance.setPlaybackRate(rate);
    else if (this.nativeEngine) this.nativeEngine.setPlaybackRate(rate);
    else if (this.video) this.video.playbackRate = rate;
  }

  destroy(): void {
    this.isDestroyed = true;

    if (this.dashInstance) {
      try {
        this.dashInstance.reset();
      } catch {}
      this.dashInstance = null;
    }

    if (this.nativeEngine) {
      this.nativeEngine.destroy();
      this.nativeEngine = null;
    }

    this.video = null;
  }
}
