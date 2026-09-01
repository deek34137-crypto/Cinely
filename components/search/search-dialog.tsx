"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Search, Film, Tv, Play, Star, Calendar, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MediaItem } from "@/lib/domain/typings";
import { Dialog, DialogContent } from "../ui/dialog";
import { Badge } from "../ui/badge";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search-preview?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: MediaItem) => {
    onOpenChange(false);
    if (item.mediaType === "movie") {
      router.push(`/movies/${item.tmdbId || item.id}`);
    } else if (item.mediaType === "anime") {
      router.push(`/anime/${item.tmdbId || item.id}`);
    } else {
      router.push(`/tvshows/${item.tmdbId || item.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-zinc-950/95 border-white/10 shadow-2xl">
        <Command className="w-full">
          <div className="flex items-center px-4 border-b border-white/10">
            <Search className="w-5 h-5 mr-3 text-zinc-400 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search movies, TV shows, anime..."
              className="w-full h-14 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none text-base"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 text-zinc-400 hover:text-white rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {loading && (
              <div className="p-6 text-center text-sm text-zinc-400">
                Searching titles across TMDB & Anime databases...
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="p-8 text-center text-sm text-zinc-400">
                No matching media found for &quot;{query}&quot;
              </div>
            )}

            {!loading && !query && (
              <div className="p-6 text-center text-xs text-zinc-500">
                Type to search across thousands of movies and TV shows
              </div>
            )}

            {results.map((item) => (
              <Command.Item
                key={`${item.mediaType}_${item.id}`}
                value={`${item.title}_${item.id}`}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-purple-600/15 transition-all text-zinc-200 hover:text-white"
              >
                <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-white/5">
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate text-white">
                      {item.title}
                    </span>
                    <Badge
                      variant={item.mediaType === "movie" ? "default" : "secondary"}
                      className="text-[10px] uppercase font-bold py-0 h-4"
                    >
                      {item.mediaType === "movie" ? (
                        <Film className="w-2.5 h-2.5 mr-1 inline" />
                      ) : (
                        <Tv className="w-2.5 h-2.5 mr-1 inline" />
                      )}
                      {item.mediaType}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                    {item.releaseDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {new Date(item.releaseDate).getFullYear() || item.releaseDate}
                      </span>
                    )}
                    {item.voteAverage ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {item.voteAverage.toFixed(1)}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                    {item.overview || "No overview available."}
                  </p>
                </div>

                <div className="shrink-0 pr-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 fill-purple-400 translate-x-0.5" />
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.List>

          {query && results.length > 0 && (
            <div className="p-2 border-t border-white/10 bg-zinc-950/60 flex justify-between items-center text-xs text-zinc-400">
              <span>Press Enter to select</span>
              <button
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                }}
                className="text-purple-400 hover:underline"
              >
                View all results &rarr;
              </button>
            </div>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  );
}
