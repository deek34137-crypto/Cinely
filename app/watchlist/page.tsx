"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { progressStorage, MediaProgress } from "@/lib/playback/progress-storage";
import { Bookmark, Play, Trash2, Clock, Film, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WatchlistPage() {
  const [history, setHistory] = React.useState<MediaProgress[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setHistory(progressStorage.getAll());
  }, []);

  const handleRemove = (item: MediaProgress) => {
    progressStorage.remove(item.contentId, item.mediaType, item.season, item.episode);
    setHistory(progressStorage.getAll());
  };

  if (!mounted) {
    return <div className="min-h-[50vh]" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
          <Bookmark className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Your Watchlist & History</h1>
          <p className="text-xs text-zinc-400">Continue watching where you left off</p>
        </div>
      </div>

      {/* History Grid */}
      {history.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {history.map((item) => {
            const href =
              item.mediaType === "movie"
                ? `/movies/${item.contentId}`
                : `/tvshows/${item.contentId}`;

            const minsLeft = Math.max(0, Math.round((item.duration - item.currentTime) / 60));

            return (
              <div
                key={`${item.mediaType}_${item.contentId}_${item.season || 1}_${item.episode || 1}`}
                className="group relative flex flex-col rounded-2xl bg-zinc-950/80 border border-white/10 overflow-hidden shadow-lg hover:border-purple-500/40 transition-all backdrop-blur-md"
              >
                {/* Poster / Still Preview */}
                <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt={item.title || "Media"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                      <Film className="w-8 h-8" />
                    </div>
                  )}

                  {/* Play trigger overlay */}
                  <Link
                    href={href}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/50">
                      <Play className="w-5 h-5 fill-white translate-x-0.5" />
                    </div>
                  </Link>

                  {/* Progress bar line */}
                  <div className="absolute bottom-0 inset-x-0 h-1.5 bg-zinc-800">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-col p-3.5 gap-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={item.mediaType === "movie" ? "default" : "secondary"}
                      className="text-[9px] uppercase font-bold py-0 h-4"
                    >
                      {item.mediaType}
                    </Badge>

                    {item.season && item.episode ? (
                      <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-500/20">
                        S{item.season} E{item.episode}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-sm font-bold text-white truncate">
                    {item.title || `${item.mediaType.toUpperCase()} #${item.contentId}`}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <Clock className="w-3 h-3" />
                      {minsLeft}m left ({Math.round(item.percentage)}%)
                    </span>

                    <button
                      onClick={() => handleRemove(item)}
                      className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center space-y-3 bg-zinc-950/40 rounded-3xl border border-white/5 p-8">
          <Bookmark className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Your watchlist is empty</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Browse movies and TV shows and click &quot;Watch Now&quot; or &quot;Add to Watchlist&quot; to track your progress here.
          </p>
        </div>
      )}
    </div>
  );
}
