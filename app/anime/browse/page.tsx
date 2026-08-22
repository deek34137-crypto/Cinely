import { tmdb } from "@/tmdb/api";
import { mapTmdbTvToMediaItem } from "@/lib/cards/mappers";
import { MediaCard } from "@/components/media/media-card";
import { MediaItem } from "@/lib/domain/typings";
import { Sparkles } from "lucide-react";

export const revalidate = 3600;

export default async function BrowseAnimePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  let animeRaw: any = { results: [] };

  try {
    animeRaw = await tmdb.tv.discover({
      page,
      with_genres: "16", // Animation genre
      with_original_language: "ja", // Japanese
      sort_by: "popularity.desc",
    });
  } catch (err) {
    console.error("Failed to load browse anime:", err);
  }

  const animeList: MediaItem[] = (animeRaw.results || []).map(mapTmdbTvToMediaItem);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Popular Anime</h1>
          <p className="text-xs text-zinc-400">Stream Japanese animation with Sub / Dub switcher</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {animeList.map((anime: MediaItem) => (
          <MediaCard key={anime.id} media={anime} />
        ))}
      </div>
    </div>
  );
}
