import { tmdb } from "@/tmdb/api";
import { mapTmdbMovieToMediaItem, mapTmdbTvToMediaItem } from "@/lib/cards/mappers";
import { MediaCard } from "@/components/media/media-card";
import { MediaItem } from "@/lib/domain/typings";
import { Search, Film, Tv } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; query?: string; type?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || params.query || "";
  const filterType = params.type || "all";

  let results: MediaItem[] = [];

  if (query.trim()) {
    try {
      const raw = await tmdb.search.multi(query, "1");
      results = (raw.results || [])
        .filter((item: any) => {
          if (filterType === "movie") return item.media_type === "movie";
          if (filterType === "tv") return item.media_type === "tv";
          return item.media_type === "movie" || item.media_type === "tv";
        })
        .map((item: any) =>
          item.media_type === "movie" ? mapTmdbMovieToMediaItem(item) : mapTmdbTvToMediaItem(item)
        );
    } catch (err) {
      console.error("Search page query error:", err);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Search Results</h1>
            <p className="text-xs text-zinc-400">
              {query ? `Showing results for "${query}"` : "Search movies, shows and anime"}
            </p>
          </div>
        </div>

        {/* Filter Badges */}
        {query && (
          <div className="flex items-center gap-2 pt-2">
            <a
              href={`/search?q=${encodeURIComponent(query)}&type=all`}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                filterType === "all"
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-white"
              }`}
            >
              All ({results.length})
            </a>
            <a
              href={`/search?q=${encodeURIComponent(query)}&type=movie`}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                filterType === "movie"
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-white"
              }`}
            >
              Movies
            </a>
            <a
              href={`/search?q=${encodeURIComponent(query)}&type=tv`}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                filterType === "tv"
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-white"
              }`}
            >
              TV Shows
            </a>
          </div>
        )}
      </div>

      {/* Results grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {results.map((item) => (
            <MediaCard key={`${item.mediaType}_${item.id}`} media={item} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-3 bg-zinc-950/40 rounded-3xl border border-white/5 p-8">
          <Search className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No results found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try searching for a different movie title, series name, or franchise keyword.
          </p>
        </div>
      )}
    </div>
  );
}
