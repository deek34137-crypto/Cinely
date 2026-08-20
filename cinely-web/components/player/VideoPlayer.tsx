import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlaybackResponse, PlaybackSource } from '../../lib/types';
import { PlaybackEngine } from './engine/playback-engine';
import { NativePlaybackEngine } from './engine/native-engine';
import { HlsPlaybackEngine } from './engine/hls-engine';
import { DashPlaybackEngine } from './engine/dash-engine';
import { useSourceFailover } from './hooks/useSourceFailover';
import { usePlaybackProgress } from './hooks/usePlaybackProgress';
import { PlayerControls } from './PlayerControls';
import { NextEpisodeOverlay } from './NextEpisodeOverlay';
import styles from './Player.module.css';

export interface NextEpisodeInfo {
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
}

export interface VideoPlayerProps {
  playbackData: PlaybackResponse;
  nextEpisode?: NextEpisodeInfo | null;
  onBack: () => void;
  onNavigateToEpisode?: (season: number, episode: number) => void;
}

export function VideoPlayer({
  playbackData,
  nextEpisode,
  onBack,
  onNavigateToEpisode,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<PlaybackEngine | null>(null);
  const lastKnownPositionRef = useRef<number>(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [showNextEpisodeCountdown, setShowNextEpisodeCountdown] = useState(false);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Source failover manager
  const {
    activeSource,
    allSources,
    failedSourceIds,
    isSwitchingSource,
    hasAvailableSource,
    triggerFailover,
    selectSourceManually,
    resetFailover,
  } = useSourceFailover({
    selected: playbackData.selected,
    alternatives: playbackData.alternatives,
    onFailoverTriggered: (failed, next) => {
      // Retain last known position when switching sources
      if (videoRef.current) {
        lastKnownPositionRef.current = videoRef.current.currentTime || lastKnownPositionRef.current;
      }
    },
  });

  // 2. Playback progress synchronization (Phase 2B integration)
  const { initialResumePosition, flushProgress } = usePlaybackProgress({
    mediaId: playbackData.mediaId,
    seasonNumber: playbackData.seasonNumber,
    episodeNumber: playbackData.episodeNumber,
    currentTime,
    duration,
    isPlaying,
  });

  // 3. Engine attachment and lifecycle
  useEffect(() => {
    if (!videoRef.current || !activeSource) {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    let engine: PlaybackEngine;

    const callbacks = {
      onPlaying: () => {
        setIsPlaying(true);
        setIsBuffering(false);
      },
      onPaused: () => {
        setIsPlaying(false);
        flushProgress();
      },
      onBuffering: (buffering: boolean) => {
        setIsBuffering(buffering);
      },
      onTimeUpdate: (curr: number, dur: number) => {
        setCurrentTime(curr);
        lastKnownPositionRef.current = curr;
        if (dur > 0) setDuration(dur);

        // Update buffered range
        if (video.buffered && video.buffered.length > 0) {
          try {
            setBufferedEnd(video.buffered.end(video.buffered.length - 1));
          } catch {}
        }
      },
      onLoadedMetadata: (dur: number) => {
        if (dur > 0) setDuration(dur);
      },
      onEnded: () => {
        setIsPlaying(false);
        flushProgress();
        if (nextEpisode) {
          setShowNextEpisodeCountdown(true);
        }
      },
      onError: (err: Error, isFatal: boolean) => {
        if (isFatal) {
          triggerFailover(lastKnownPositionRef.current);
        }
      },
    };

    // Instantiate appropriate protocol engine
    if (activeSource.protocol === 'hls') {
      engine = new HlsPlaybackEngine(callbacks);
    } else if (activeSource.protocol === 'dash') {
      engine = new DashPlaybackEngine(callbacks);
    } else {
      engine = new NativePlaybackEngine(callbacks);
    }

    engineRef.current = engine;

    // Use initial resume position or preserved failover position
    const startPosition = lastKnownPositionRef.current > 0
      ? lastKnownPositionRef.current
      : initialResumePosition;

    engine.attach(video, activeSource, startPosition).catch(() => {
      triggerFailover(lastKnownPositionRef.current);
    });

    return () => {
      engine.destroy();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [activeSource, initialResumePosition, nextEpisode, flushProgress, triggerFailover]);

  // 4. Inactivity timer for controls overlay
  const resetControlsTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }

    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying]);

  const handleMouseMove = () => {
    resetControlsTimer();
  };

  // 5. Control Handlers
  const handlePlayPause = useCallback(() => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.play().catch(() => {});
    }
    resetControlsTimer();
  }, [isPlaying, resetControlsTimer]);

  const handleSeek = useCallback((targetTime: number) => {
    if (!engineRef.current) return;
    engineRef.current.seek(targetTime);
    setCurrentTime(targetTime);
    lastKnownPositionRef.current = targetTime;
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleSkip = useCallback((offset: number) => {
    if (!engineRef.current || !videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, (videoRef.current.currentTime || 0) + offset));
    handleSeek(newTime);
  }, [duration, handleSeek]);

  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (engineRef.current) {
      engineRef.current.setVolume(newVol);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      if (engineRef.current) engineRef.current.setVolume(volume || 1);
    } else {
      setIsMuted(true);
      if (engineRef.current) engineRef.current.setVolume(0);
    }
  }, [isMuted, volume]);

  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // 6. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          handleToggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleSkip, handleVolumeChange, handleToggleMute, handleToggleFullscreen, volume]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 7. No playable streams empty state
  if (!hasAvailableSource) {
    return (
      <div className={styles.playerContainer} data-testid="player-no-streams">
        <div className={styles.emptyStateContainer}>
          <div className={styles.emptyIcon}>🎬</div>
          <h2 className={styles.emptyTitle}>No Playable Streams Available</h2>
          <p className={styles.emptyBody}>
            None of the available sources for <strong>{playbackData.title}</strong> could be played in your browser.
            Try adding stream-ready addons in your Addon Settings or retry.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={resetFailover}
              data-testid="player-retry-btn"
            >
              Retry Sources
            </button>
            <button
              type="button"
              className={styles.backBtn}
              onClick={onBack}
              data-testid="player-return-btn"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.playerContainer}
      onMouseMove={handleMouseMove}
      onClick={resetControlsTimer}
      data-testid="cinely-video-player"
    >
      {/* Video HTML5 Element */}
      <video
        ref={videoRef}
        className={styles.videoElement}
        playsInline
        onClick={handlePlayPause}
        data-testid="html5-video-element"
      />

      {/* Center Status Feedback */}
      {(isBuffering || isSwitchingSource) && (
        <div className={styles.centerOverlay}>
          <div className={styles.loadingSpinner} data-testid="player-buffering-spinner" />
          {isSwitchingSource && (
            <div className={styles.failoverNotification} data-testid="failover-notice">
              <span>⚡ Switching to alternative stream...</span>
            </div>
          )}
        </div>
      )}

      {/* Custom Video Controls Overlay */}
      <PlayerControls
        title={playbackData.title}
        seasonNumber={playbackData.seasonNumber}
        episodeNumber={playbackData.episodeNumber}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        bufferedEnd={bufferedEnd}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        activeSource={activeSource}
        allSources={allSources}
        failedSourceIds={failedSourceIds}
        hasNextEpisode={Boolean(nextEpisode)}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onSkip={handleSkip}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleFullscreen={handleToggleFullscreen}
        onNextEpisode={() => {
          if (nextEpisode && onNavigateToEpisode) {
            flushProgress();
            onNavigateToEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber);
          }
        }}
        onSelectSource={selectSourceManually}
        onBack={() => {
          flushProgress();
          onBack();
        }}
        isControlsVisible={isControlsVisible}
      />

      {/* Auto-Next Episode Countdown Overlay */}
      {showNextEpisodeCountdown && nextEpisode && (
        <NextEpisodeOverlay
          nextEpisodeTitle={nextEpisode.title}
          seasonNumber={nextEpisode.seasonNumber}
          episodeNumber={nextEpisode.episodeNumber}
          onPlayNow={() => {
            setShowNextEpisodeCountdown(false);
            flushProgress();
            onNavigateToEpisode?.(nextEpisode.seasonNumber, nextEpisode.episodeNumber);
          }}
          onCancel={() => setShowNextEpisodeCountdown(false)}
        />
      )}
    </div>
  );
}
