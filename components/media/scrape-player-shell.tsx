"use client";

import * as React from "react";
import { ServerSelector } from "./controls/server-selector";
import { ScrapingOverlay } from "./controls/scraping-overlay";
import { ScrapeStatusCircle } from "./controls/scrape-status-circle";
import { ScrapeHlsPlayer } from "./scrape-hls-player";
import { ScrapeShakaDashPlayer } from "./scrape-shaka-dash-player";
import { IntrodbSegmentControl } from "./controls/introdb-segment-control";
import { useServerStore } from "@/lib/stores/server-store";
import { getEmbedUrl } from "@/lib/providers/embed-urls";
import { MediaSegment } from "@/lib/playback/introdb";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";

export interface ScrapePlayerShellProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  mediaKind?: "movie" | "tv" | "anime";
  title: string;
  mediaTitle?: string;
  poster?: string;
  season?: number;
  episode?: number;
  imdbId?: string | null;
  dub?: boolean;
  onEnded?: () => void;
}

export function ScrapePlayerShell({
  tmdbId,
  mediaType,
  mediaKind,
  title,
  mediaTitle,
  poster,
  season = 1,
  episode = 1,
  imdbId,
  dub = false,
  onEnded,
}: ScrapePlayerShellProps) {
  const { selectedServer, playbackMode, setPlaybackMode, setSelectedServer } = useServerStore();

  const [scrapeLoading, setScrapeLoading] = React.useState(false);
  const [scrapeResolved, setScrapeResolved] = React.useState(false);
  const [scrapeError, setScrapeError] = React.useState<string | null>(null);
  const [streamData, setStreamData] = React.useState<{
    playUrl: string;
    streamType: "hls" | "dash" | "mp4";
    providerName: string;
    subtitles?: Array<{ lang: string; url: string }>;
  } | null>(null);

  const [currentTime, setCurrentTime] = React.useState(0);
  const [segments, setSegments] = React.useState<MediaSegment[]>([]);

  // Fetch IntroDB skip segments if imdbId is present
  React.useEffect(() => {
    if (!imdbId) return;
    fetch(`/api/introdb/segments?imdbId=${imdbId}&season=${season}&episode=${episode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.segments) setSegments(data.segments);
      })
      .catch(() => undefined);
  }, [imdbId, season, episode]);

  // Scrape stream handler
  const triggerScrape = React.useCallback(async () => {
    if (selectedServer.id !== "scrape") return;
    setScrapeLoading(true);
    setScrapeError(null);
    setScrapeResolved(false);

    try {
      const isAnime = mediaKind === "anime";
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaKind: isAnime ? "anime" : "tmdb",
          tmdbId,
          mediaType,
          title: mediaTitle || title,
          season,
          episode,
          dub,
        }),
      });

      if (!res.ok) {
        throw new Error("Direct scraping unavailable");
      }

      const data = await res.json();
      if (data && data.playUrl) {
        setStreamData({
          playUrl: data.playUrl,
          streamType: data.streamType || "hls",
          providerName: data.providerName || (isAnime ? "ReAnime HLS" : "VidKing"),
          subtitles: data.subtitles || [],
        });
        setScrapeResolved(true);
      } else {
        throw new Error("No playable stream url returned");
      }
    } catch (err: any) {
      setScrapeError(err.message || "Failed to resolve direct stream");
      // Auto-fallback to embed mode after short delay if scrape fails
      setTimeout(() => {
        setPlaybackMode("embed");
      }, 1500);
    } finally {
      setScrapeLoading(false);
    }
  }, [selectedServer.id, tmdbId, mediaType, mediaKind, mediaTitle, title, season, episode, dub, setPlaybackMode]);

  // Re-trigger scrape when media/episode changes if in scrape mode
  React.useEffect(() => {
    if (selectedServer.id === "scrape") {
      triggerScrape();
    }
  }, [triggerScrape, selectedServer.id]);

  const embedUrl = getEmbedUrl(selectedServer.id, tmdbId, mediaType, season, episode);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top player toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <ServerSelector />
          <ScrapeStatusCircle
            status={
              scrapeLoading
                ? "scraping"
                : selectedServer.id === "scrape"
                ? streamData
                  ? "direct"
                  : "error"
                : "embed"
            }
          />
        </div>

        <div className="flex items-center gap-2">
          {selectedServer.id === "scrape" && (
            <button
              onClick={triggerScrape}
              disabled={scrapeLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scrapeLoading ? "animate-spin text-purple-400" : ""}`} />
              <span>Retry Race</span>
            </button>
          )}
        </div>
      </div>

      {/* Main player viewport container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl">
        {selectedServer.id === "scrape" && streamData ? (
          <>
            {streamData.streamType === "dash" ? (
              <ScrapeShakaDashPlayer playUrl={streamData.playUrl} poster={poster} />
            ) : (
              <ScrapeHlsPlayer
                playUrl={streamData.playUrl}
                title={title}
                poster={poster}
                contentId={tmdbId}
                mediaType={mediaType}
                season={season}
                episode={episode}
                subtitles={streamData.subtitles}
                onTimeUpdate={(t) => setCurrentTime(t)}
                onEnded={onEnded}
              />
            )}

            <IntrodbSegmentControl
              currentTime={currentTime}
              segments={segments}
              onSkip={(t) => setCurrentTime(t)}
            />
          </>
        ) : selectedServer.id === "scrape" && scrapeLoading ? (
          <ScrapingOverlay activeProvider="vidking" resolved={scrapeResolved} error={!!scrapeError} />
        ) : (
          /* Embed Iframe Fallback */
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          />
        )}
      </div>
    </div>
  );
}
