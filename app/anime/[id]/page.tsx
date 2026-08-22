import { tmdb } from "@/tmdb/api";
import { mapTmdbTvDetails } from "@/lib/cards/mappers";
import { AnimePlayerSection } from "@/components/media/anime-player-section";
import { ExpandableCastGrid } from "@/components/media/expandable-cast-grid";
import { MediaCarousel } from "@/components/media/media-carousel";
import { AmbientVideoBackdrop } from "@/components/hero/ambient-video-backdrop";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export default async function AnimeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let animeDetails: any = null;

  try {
    const raw = await tmdb.tv.detail(id);
    animeDetails = mapTmdbTvDetails(raw);
  } catch (error) {
    console.error(`Failed to load anime ${id}:`, error);
  }

  if (!animeDetails) {
    notFound();
  }

  const tmdbId = Number(animeDetails.tmdbId || animeDetails.id);

  return (
    <div className="relative min-h-screen pb-20">
      <AmbientVideoBackdrop backdropUrl={animeDetails.backdropUrl} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-10">
        {/* Anime Player */}
        <section className="w-full">
          <AnimePlayerSection
            tmdbId={tmdbId}
            title={animeDetails.title}
            poster={animeDetails.backdropUrl || animeDetails.posterUrl}
            totalEpisodes={animeDetails.numberOfEpisodes || 24}
          />
        </section>

        {/* Anime Metadata Overview */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="relative aspect-[2/3] w-48 sm:w-56 lg:w-full mx-auto overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 shadow-xl">
              <Image
                src={animeDetails.posterUrl}
                alt={animeDetails.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Rating</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {animeDetails.voteAverage?.toFixed(1)} / 10
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-400">
                <span>Total Episodes</span>
                <span className="text-zinc-200 font-medium">{animeDetails.numberOfEpisodes || 24}</span>
              </div>

              {animeDetails.status && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Status</span>
                  <span className="text-zinc-200 font-medium">{animeDetails.status}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="glow" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Anime Series</span>
                </Badge>

                {animeDetails.genres?.map((g: string) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
                {animeDetails.title}
              </h1>

              {animeDetails.tagline && (
                <p className="text-base italic text-purple-300">
                  &ldquo;{animeDetails.tagline}&rdquo;
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Synopsis
              </h3>
              <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                {animeDetails.overview || "No overview available."}
              </p>
            </div>

            <ExpandableCastGrid cast={animeDetails.cast} />
          </div>
        </section>

        {animeDetails.similar && animeDetails.similar.length > 0 && (
          <MediaCarousel title="Similar Anime Series" items={animeDetails.similar} />
        )}
      </div>
    </div>
  );
}
