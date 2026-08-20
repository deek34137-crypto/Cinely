import React, { useEffect, useState } from 'react';
import styles from './Player.module.css';

export interface NextEpisodeOverlayProps {
  nextEpisodeTitle?: string;
  seasonNumber: number;
  episodeNumber: number;
  onPlayNow: () => void;
  onCancel: () => void;
  initialCountdownSeconds?: number;
}

export function NextEpisodeOverlay({
  nextEpisodeTitle,
  seasonNumber,
  episodeNumber,
  onPlayNow,
  onCancel,
  initialCountdownSeconds = 10,
}: NextEpisodeOverlayProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialCountdownSeconds);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onPlayNow();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, onPlayNow]);

  const formattedEpisode = `S${String(seasonNumber).padStart(2, '0')} E${String(episodeNumber).padStart(2, '0')}`;

  return (
    <div className={styles.nextEpisodeOverlay} data-testid="next-episode-overlay">
      <p className={styles.nextEpisodeTitle}>Up Next: {formattedEpisode}</p>
      {nextEpisodeTitle && <p className={styles.countdownText}>{nextEpisodeTitle}</p>}
      <p className={styles.countdownText}>Playing next episode in {secondsRemaining}s...</p>
      <div className={styles.nextEpisodeActions}>
        <button
          type="button"
          className={styles.playNowBtn}
          onClick={onPlayNow}
          data-testid="play-next-now-btn"
        >
          Play Now
        </button>
        <button
          type="button"
          className={styles.cancelNextBtn}
          onClick={onCancel}
          data-testid="cancel-next-btn"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
