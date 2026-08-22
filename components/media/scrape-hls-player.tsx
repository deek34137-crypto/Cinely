"use client";

import { MediaPlayer, MediaProvider, Track } from "@vidstack/react";
import { useEffect, useRef } from "react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import { progressStorage } from "@/lib/playback/progress-storage";

export interface SubtitleTrack {
  lang: string;
  url: string;
}

export function ScrapeHlsPlayer({
  playUrl,
  title,
  poster,
  contentId,
  mediaType = "movie",
  season,
  episode,
  subtitles = [],
  onTimeUpdate,
  onEnded,
}: {
  playUrl: string;
  title: string;
  poster?: string;
  contentId?: number;
  mediaType?: "movie" | "tv";
  season?: number;
  episode?: number;
  subtitles?: SubtitleTrack[];
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}) {
  const playerRef = useRef<any>(null);

  // Proactive Keep-Alive: refreshes token session every 45 seconds
  useEffect(() => {
    if (!playUrl || !playUrl.startsWith("/api/scrape/play")) return;
    const timer = setInterval(() => {
      fetch(playUrl, { method: "HEAD", cache: "no-store" }).catch(() => undefined);
    }, 45000);
    return () => clearInterval(timer);
  }, [playUrl]);

  // Resume playback position
  const handleCanPlay = () => {
    if (contentId && playerRef.current) {
      const saved = progressStorage.get(contentId, mediaType, season, episode);
      if (saved && saved.currentTime > 5 && saved.percentage < 95) {
        playerRef.current.currentTime = saved.currentTime;
      }
    }
  };

  const handleTimeUpdate = (detail: any) => {
    const currentTime = detail?.currentTime ?? 0;
    const duration = detail?.duration ?? 0;
    if (onTimeUpdate) {
      onTimeUpdate(currentTime, duration);
    }
    if (contentId && duration > 0) {
      progressStorage.save({
        contentId,
        mediaType,
        season,
        episode,
        currentTime,
        duration,
        title,
        posterUrl: poster,
      });
    }
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl border border-white/10 group">
      <MediaPlayer
        ref={playerRef}
        src={playUrl}
        title={title}
        poster={poster}
        streamType="on-demand"
        playsInline
        autoPlay
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnd={onEnded}
        onProviderChange={(provider) => {
          if (provider && "config" in provider) {
            provider.config = {
              maxBufferLength: 60,
              backBufferLength: 120,
              enableWorker: true,
            };
          }
        }}
        className="h-full w-full"
      >
        <MediaProvider>
          {subtitles.map((sub) => (
            <Track
              key={sub.url}
              src={sub.url}
              kind="subtitles"
              label={sub.lang}
              lang={sub.lang}
              default={sub.lang.toLowerCase().includes("eng")}
            />
          ))}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
}
