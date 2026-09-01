"use client";

import * as React from "react";
import { ScrapePlayerShell } from "./scrape-player-shell";
import { ScrapeAudioVariantControls } from "./controls/scrape-audio-variant-controls";
import { Sparkles, Play } from "lucide-react";

export function AnimePlayerSection({
  tmdbId,
  title,
  poster,
  totalEpisodes = 24,
}: {
  tmdbId: number;
  title: string;
  poster?: string;
  totalEpisodes?: number;
}) {
  const [currentEpisode, setCurrentEpisode] = React.useState(1);
  const [isDub, setIsDub] = React.useState(false);

  const episodeCount = Math.max(totalEpisodes || 12, 12);
  const epArray = Array.from({ length: episodeCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top audio controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Anime Stream Engine
          </span>
        </div>
        <ScrapeAudioVariantControls onChange={(dub) => setIsDub(dub)} />
      </div>

      {/* Video player */}
      <ScrapePlayerShell
        tmdbId={tmdbId}
        mediaType="tv"
        mediaKind="anime"
        mediaTitle={title}
        title={`${title} — Episode ${currentEpisode} (${isDub ? "Dub" : "Sub"})`}
        poster={poster}
        season={1}
        episode={currentEpisode}
        dub={isDub}
        onEnded={() => {
          if (currentEpisode < episodeCount) {
            setCurrentEpisode((prev) => prev + 1);
          }
        }}
      />

      {/* Episode selector grid */}
      <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Episodes ({episodeCount})</h3>
          <span className="text-xs text-purple-300 bg-purple-950/60 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
            {isDub ? "English Dub" : "Japanese Audio / English Subs"}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 max-h-60 overflow-y-auto pr-1">
          {epArray.map((epNum) => {
            const isSelected = epNum === currentEpisode;
            return (
              <button
                key={epNum}
                onClick={() => setCurrentEpisode(epNum)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/40 scale-105"
                    : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-white/5"
                }`}
              >
                EP {epNum}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
