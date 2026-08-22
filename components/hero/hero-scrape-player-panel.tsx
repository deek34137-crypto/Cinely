"use client";

import * as React from "react";
import { X } from "lucide-react";
import { ScrapePlayerShell } from "../media/scrape-player-shell";

export function HeroScrapePlayerPanel({
  isOpen,
  onClose,
  tmdbId,
  mediaType,
  title,
  poster,
  season,
  episode,
  imdbId,
}: {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster?: string;
  season?: number;
  episode?: number;
  imdbId?: string | null;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-zinc-950/95 border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl overflow-hidden">
        {/* Header toolbar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white truncate max-w-md">{title}</h2>
            {mediaType === "tv" && (
              <span className="text-xs text-purple-300 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-medium">
                S{season} E{episode}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player mount */}
        <ScrapePlayerShell
          tmdbId={tmdbId}
          mediaType={mediaType}
          title={title}
          poster={poster}
          season={season}
          episode={episode}
          imdbId={imdbId}
        />
      </div>
    </div>
  );
}
