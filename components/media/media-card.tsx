"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Play, Calendar, Film, Tv } from "lucide-react";
import { MediaItem } from "@/lib/domain/typings";
import { Badge } from "../ui/badge";

export function MediaCard({ media }: { media: MediaItem }) {
  const targetHref =
    media.mediaType === "movie"
      ? `/movies/${media.tmdbId || media.id}`
      : media.mediaType === "anime"
      ? `/anime/${media.tmdbId || media.id}`
      : `/tvshows/${media.tmdbId || media.id}`;

  const year = media.releaseDate ? new Date(media.releaseDate).getFullYear() : null;

  return (
    <Link href={targetHref} className="group relative flex flex-col gap-2 rounded-2xl cursor-pointer">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:border-purple-500/50 group-hover:shadow-xl group-hover:shadow-purple-900/20">
        <Image
          src={media.posterUrl}
          alt={media.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized
        />

        {/* Hover overlay with quick play button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5">
          <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/50 mx-auto mb-2 transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white translate-x-0.5" />
          </div>
          <span className="text-[11px] font-bold text-center text-white">Watch Now</span>
        </div>

        {/* Media type badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge
            variant={
              media.mediaType === "movie"
                ? "default"
                : media.mediaType === "anime"
                ? "glow"
                : "secondary"
            }
            className="text-[9px] uppercase font-black py-0 h-4 shadow-md backdrop-blur-md bg-black/60 border-white/10"
          >
            {media.mediaType}
          </Badge>
        </div>

        {/* Rating badge */}
        {media.voteAverage ? (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-400">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            <span>{media.voteAverage.toFixed(1)}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col px-1">
        <h4 className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
          {media.title}
        </h4>
        <div className="flex items-center justify-between text-xs text-zinc-400 mt-0.5">
          <span>{year || "Media"}</span>
          {media.voteCount ? (
            <span className="text-[10px] text-zinc-500">{media.voteCount} votes</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
