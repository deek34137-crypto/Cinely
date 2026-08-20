import React, { useState, useRef, useCallback } from 'react';
import { PlaybackSource } from '../../lib/types';
import styles from './Player.module.css';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface PlayerControlsProps {
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  activeSource: PlaybackSource | null;
  allSources: PlaybackSource[];
  failedSourceIds: Set<string>;
  hasNextEpisode?: boolean;
  onPlayPause: () => void;
  onSeek: (timeSeconds: number) => void;
  onSkip: (offsetSeconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onNextEpisode?: () => void;
  onSelectSource: (sourceId: string) => void;
  onBack: () => void;
  isControlsVisible: boolean;
}

export function PlayerControls({
  title,
  seasonNumber = 0,
  episodeNumber = 0,
  isPlaying,
  currentTime,
  duration,
  bufferedEnd,
  volume,
  isMuted,
  isFullscreen,
  activeSource,
  allSources,
  failedSourceIds,
  hasNextEpisode,
  onPlayPause,
  onSeek,
  onSkip,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onNextEpisode,
  onSelectSource,
  onBack,
  isControlsVisible,
}: PlayerControlsProps) {
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPositionPercent, setHoverPositionPercent] = useState<number>(0);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const isTv = seasonNumber > 0 && episodeNumber > 0;
  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(clickRatio * duration);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, moveX / rect.width));
    setHoverPositionPercent(ratio * 100);
    setHoverTime(ratio * duration);
  };

  const handleScrubberMouseLeave = () => {
    setHoverTime(null);
  };

  return (
    <>
      <div
        className={styles.controlsOverlay}
        data-hidden={!isControlsVisible}
        data-testid="player-controls-overlay"
      >
        {/* Top Bar */}
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={onBack}
              title="Back"
              data-testid="player-back-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div className={styles.mediaTitleInfo}>
              <h2 className={styles.mediaTitle}>{title}</h2>
              {isTv && (
                <span className={styles.episodeBadge} data-testid="player-episode-badge">
                  S{String(seasonNumber).padStart(2, '0')} E{String(episodeNumber).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          <div className={styles.topRight}>
            {activeSource && (
              <button
                type="button"
                className={styles.sourceBadgeBtn}
                onClick={() => setIsSourceModalOpen(true)}
                title="Change stream source"
                data-testid="source-selector-btn"
              >
                <span>⚡ {activeSource.providerName} • {activeSource.quality}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          {/* Scrubber Container */}
          <div
            ref={scrubberRef}
            className={styles.scrubberContainer}
            onClick={handleScrubberClick}
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={handleScrubberMouseLeave}
            data-testid="player-scrubber"
          >
            <div className={styles.bufferedProgress} style={{ width: `${bufferedPercent}%` }} />
            <div className={styles.playedProgress} style={{ width: `${playedPercent}%` }} />
            <div className={styles.scrubberHandle} style={{ left: `${playedPercent}%` }} />

            {hoverTime !== null && (
              <div
                className={styles.hoverTimePreview}
                style={{ left: `${hoverPositionPercent}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Controls Row */}
          <div className={styles.controlsRow}>
            <div className={styles.controlsLeft}>
              <button
                type="button"
                className={styles.controlBtn}
                onClick={onPlayPause}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                data-testid="player-play-pause-btn"
              >
                {isPlaying ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className={styles.controlBtn}
                onClick={() => onSkip(-10)}
                title="Replay 10 seconds (←)"
                data-testid="player-skip-back-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>

              <button
                type="button"
                className={styles.controlBtn}
                onClick={() => onSkip(10)}
                title="Skip 10 seconds (→)"
                data-testid="player-skip-forward-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>

              {hasNextEpisode && onNextEpisode && (
                <button
                  type="button"
                  className={styles.controlBtn}
                  onClick={onNextEpisode}
                  title="Next Episode"
                  data-testid="player-next-episode-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              )}

              <div className={styles.volumeControl}>
                <button
                  type="button"
                  className={styles.controlBtn}
                  onClick={onToggleMute}
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  data-testid="player-mute-btn"
                >
                  {isMuted || volume === 0 ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className={styles.volumeSlider}
                  aria-label="Volume"
                />
              </div>

              <span className={styles.timeDisplay} data-testid="player-time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className={styles.controlsRight}>
              <button
                type="button"
                className={styles.controlBtn}
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                data-testid="player-fullscreen-btn"
              >
                {isFullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Source Selection Modal */}
      {isSourceModalOpen && (
        <div className={styles.sourceModalBackdrop} onClick={() => setIsSourceModalOpen(false)}>
          <div className={styles.sourceModal} onClick={(e) => e.stopPropagation()} data-testid="source-switcher-modal">
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Select Stream Source</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsSourceModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.sourceList}>
              {allSources.map((s) => {
                const isActive = activeSource?.id === s.id;
                const isFailed = failedSourceIds.has(s.id);

                return (
                  <div
                    key={s.id}
                    className={styles.sourceItem}
                    data-active={isActive}
                    data-failed={isFailed}
                    data-testid={`source-item-${s.id}`}
                    onClick={() => {
                      onSelectSource(s.id);
                      setIsSourceModalOpen(false);
                    }}
                  >
                    <div>
                      <p className={styles.sourceName}>
                        {s.providerName} • {s.quality} {s.codec ? `(${s.codec})` : ''}
                      </p>
                      <p className={styles.sourceMeta}>{s.title}</p>
                    </div>
                    {isActive && <span className={styles.activeCheck}>✓ Playing</span>}
                    {isFailed && !isActive && <span style={{ color: '#888', fontSize: '0.75rem' }}>Failed</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
