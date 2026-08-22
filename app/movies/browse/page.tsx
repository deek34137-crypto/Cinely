import { tmdb } from "@/tmdb/api";
import { mapTmdbMovieToMediaItem } from "@/lib/cards/mappers";
import { MediaCard } from "@/components/media/media-card";
import { MediaItem } from "@/lib/domain/typings";
import { Film } from "lucide-react";

export const revalidate = 3600;

export default async function BrowseMoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; genre?: string }>;
}) {
  const { page = "1", genre } = await searchParams;
  let moviesRaw: any = { results: [] };
  let genres: { id: number; name: string }[] = [];

  try {
    const [moviesRes, genresRes] = await Promise.allSettled([
      tmdb.movie.discover({
        page,
        ...(genre ? { with_genres: genre } : {}),
      }),
      tmdb.genres.movieList(),
    ]);

    if (moviesRes.status === "fulfilled") moviesRaw = moviesRes.value;
    if (genresRes.status === "fulfilled") genres = genresRes.value.genres || [];
  } catch (err) {
    console.error("Failed to load browse movies:", err);
  }

  const movies: MediaItem[] = (moviesRaw.results || []).map(mapTmdbMovieToMediaItem);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-purple-400">
          <Film className="w-6 h-6" />
          <h1 className="text-3xl font-black tracking-tight text-white">Browse Movies</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Explore the full movie library with fast ad-free stream decryption.
        </p>

        {/* Genre filter pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href="/movies/browse"
            className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
              !genre
                ? "bg-purple-600 text-white border-purple-500"
                : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-white"
            }`}
          >
            All Genres
          </a>
          {genres.map((g) => {
            const isSelected = genre === String(g.id);
            return (
              <a
                key={g.id}
                href={`/movies/browse?genre=${g.id}`}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-white"
                }`}
              >
                {g.name}
              </a>
            );
          })}
        </div>
      </div>

      {/* Movies Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.map((movie: MediaItem) => (
          <MediaCard key={movie.id} media={movie} />
        ))}
      </div>
    </div>
  );
}
