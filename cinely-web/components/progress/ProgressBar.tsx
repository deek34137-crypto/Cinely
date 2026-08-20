'use client';

import React from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** Server-computed progressPercent (0–100). Must NOT be recalculated client-side. */
  progressPercent: number;
  variant?: 'thin' | 'thick';
  className?: string;
  'aria-label'?: string;
}

/**
 * Renders a server-authoritative progress bar.
 * The progressPercent prop MUST come from the engine's PlaybackProgress.progressPercent —
 * never from client-computed positionSeconds/durationSeconds.
 */
export function ProgressBar({
  progressPercent,
  variant = 'thin',
  className,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, progressPercent));

  return (
    <div
      className={`${styles.progressBarContainer} ${styles[variant]} ${className ?? ''}`}
      role="progressbar"
      aria-valuenow={clampedPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? `Progress: ${clampedPercent}%`}
    >
      <div
        className={styles.progressBarFill}
        style={{ width: `${clampedPercent}%` }}
      />
    </div>
  );
}
