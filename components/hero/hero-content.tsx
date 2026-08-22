"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Check, Star, Calendar, Clock, Film, Tv, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { MediaItem } from "@/lib/domain/typings";
import { useAdblockGateAction } from "@/components/providers/adblock-gate-provider";

export function HeroContent({
  media,
  onPlayClick,
  inWatchlist = false,
  onToggleWatchlist,
}: {
  media: MediaItem & {
    runtime?: number | null;
    genres?: string[];
    tagline?: string | null;
  };
  onPlayClick?: () => void;
  inWatchlist?: boolean;
  onToggleWatchlist?: () => void;
}) {
  const [watchlistState, setWatchlistState] = React.useState(inWatchlist);
  const router = useRouter();
  const gateAction = useAdblockGateAction();

  const handleWatchlist = () => {
    setWatchlistState(!watchlistState);
    if (onToggleWatchlist) onToggleWatchlist();
  };

  const handleWatchNow = () => {
    gateAction(() => {
      if (onPlayClick) {
        onPlayClick();
      } else {
        const path =
          media.mediaType === "movie"
            ? `/movies/${media.tmdbId || media.id}`
            : `/tvshows/${media.tmdbId || media.id}`;
        router.push(path);
      }
    });
  };

  const year = media.releaseDate ? new Date(media.releaseDate).getFullYear() : null;

  return (
    <div className="relative z-20 flex flex-col justify-end max-w-2xl px-6 md:px-12 pb-12 pt-32 h-full">
      {/* Badges / Category row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="glow" className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Featured Direct Stream</span>
        </Badge>

        <Badge variant="secondary" className="uppercase font-bold text-[10px]">
          {media.mediaType === "movie" ? (
            <Film className="w-3 h-3 mr-1 inline" />
          ) : (
            <Tv className="w-3 h-3 mr-1 inline" />
          )}
          {media.mediaType}
        </Badge>

        {year && (
          <span className="flex items-center gap-1 text-xs font-semibold text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
            <Calendar className="w-3 h-3 text-zinc-400" />
            {year}
          </span>
        )}

        {media.voteAverage ? (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
            <Star className="w-3 h-3 fill-amber-400" />
            {media.voteAverage.toFixed(1)}
          </span>
        ) : null}

        {media.runtime ? (
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-400">
            <Clock className="w-3 h-3" />
            {media.runtime} min
          </span>
        ) : null}
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-md">
        {media.title}
      </h1>

      {/* Tagline */}
      {media.tagline && (
        <p className="text-sm md:text-base font-medium italic text-purple-300/90 mt-2">
          &ldquo;{media.tagline}&rdquo;
        </p>
      )}

      {/* Genres */}
      {media.genres && media.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {media.genres.slice(0, 4).map((g) => (
            <span
              key={g}
              className="text-xs text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-md border border-white/5"
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Overview */}
      <p className="text-sm sm:text-base text-zinc-300 mt-4 line-clamp-3 leading-relaxed drop-shadow">
        {media.overview || "No overview available for this title."}
      </p>

      {/* Action CTA Buttons */}
      <div className="flex flex-wrap items-center gap-3 mt-6">
        <Button
          size="lg"
          onClick={handleWatchNow}
          className="gap-2.5 px-7 text-base shadow-xl shadow-purple-900/40"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>Watch Now</span>
        </Button>

        <Button
          variant="glass"
          size="lg"
          onClick={handleWatchlist}
          className="gap-2 px-5"
        >
          {watchlistState ? (
            <>
              <Check className="w-4 h-4 text-purple-400" />
              <span>In Watchlist</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add to Watchlist</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
