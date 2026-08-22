import { tmdb } from "@/tmdb/api";
import { mapTmdbTvToMediaItem } from "@/lib/cards/mappers";
import { MediaCard } from "@/components/media/media-card";
import { MediaItem } from "@/lib/domain/typings";
import { Tv } from "lucide-react";

export const revalidate = 3600;

export default async function BrowseTvShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; genre?: string }>;
}) {
  const { page = "1", genre } = await searchParams;
  let tvRaw: any = { results: [] };
  let genres: { id: number; name: string }[] = [];

  try {
    const [tvRes, genresRes] = await Promise.allSettled([
      tmdb.tv.discover({
        page,
        ...(genre ? { with_genres: genre } : {}),
      }),
      tmdb.genres.tvList(),
    ]);

    if (tvRes.status === "fulfilled") tvRaw = tvRes.value;
    if (genresRes.status === "fulfilled") genres = genresRes.value.genres || [];
  } catch (err) {
    console.error("Failed to load browse TV shows:", err);
  }

  const shows: MediaItem[] = (tvRaw.results || []).map(mapTmdbTvToMediaItem);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-indigo-400">
          <Tv className="w-6 h-6" />
          <h1 className="text-3xl font-black tracking-tight text-white">Browse TV Shows</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Stream full television seasons and episodes with automatic next-episode advance.
        </p>

        {/* Genre filter pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href="/tvshows/browse"
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
                href={`/tvshows/browse?genre=${g.id}`}
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {shows.map((show: MediaItem) => (
          <MediaCard key={show.id} media={show} />
        ))}
      </div>
    </div>
  );
}
