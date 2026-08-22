import { tmdb } from "@/tmdb/api";
import { mapTmdbMovieToMediaItem } from "@/lib/cards/mappers";
import { MediaCard } from "@/components/media/media-card";
import { MediaItem } from "@/lib/domain/typings";
import { Star } from "lucide-react";

export const revalidate = 3600;

export default async function TopRatedMoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  let moviesRaw: any = { results: [] };

  try {
    moviesRaw = await tmdb.movie.topRated(page);
  } catch (err) {
    console.error("Failed to load top rated movies:", err);
  }

  const movies: MediaItem[] = (moviesRaw.results || []).map(mapTmdbMovieToMediaItem);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
          <Star className="w-5 h-5 fill-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Top Rated Movies</h1>
          <p className="text-xs text-zinc-400">All-time cinematic masterpieces ranked by viewers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.map((movie: MediaItem) => (
          <MediaCard key={movie.id} media={movie} />
        ))}
      </div>
    </div>
  );
}
