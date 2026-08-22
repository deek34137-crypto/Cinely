import { tmdb } from "@/tmdb/api";
import { mapTmdbTvDetails } from "@/lib/cards/mappers";
import { TvEpisodePlayerSection } from "@/components/media/tv-episode-player-section";
import { ExpandableCastGrid } from "@/components/media/expandable-cast-grid";
import { MediaCarousel } from "@/components/media/media-carousel";
import { AmbientVideoBackdrop } from "@/components/hero/ambient-video-backdrop";
import { Badge } from "@/components/ui/badge";
import { Star, Tv } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export default async function TvShowDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let tvDetails: any = null;

  try {
    const raw = await tmdb.tv.detail(id);
    tvDetails = mapTmdbTvDetails(raw);
  } catch (error) {
    console.error(`Failed to load TV show ${id}:`, error);
  }

  if (!tvDetails) {
    notFound();
  }

  const tmdbId = Number(tvDetails.tmdbId || tvDetails.id);

  return (
    <div className="relative min-h-screen pb-20">
      <AmbientVideoBackdrop backdropUrl={tvDetails.backdropUrl} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-10">
        {/* Main TV Player & Episode Picker */}
        <section className="w-full">
          <TvEpisodePlayerSection
            tmdbId={tmdbId}
            showTitle={tvDetails.title}
            poster={tvDetails.backdropUrl || tvDetails.posterUrl}
            seasons={tvDetails.seasons}
          />
        </section>

        {/* TV Show Metadata & Overview */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="relative aspect-[2/3] w-48 sm:w-56 lg:w-full mx-auto overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 shadow-xl">
              <Image
                src={tvDetails.posterUrl}
                alt={tvDetails.title}
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
                  {tvDetails.voteAverage?.toFixed(1)} / 10
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-400">
                <span>Total Seasons</span>
                <span className="text-zinc-200 font-medium">{tvDetails.numberOfSeasons}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-400">
                <span>Total Episodes</span>
                <span className="text-zinc-200 font-medium">{tvDetails.numberOfEpisodes}</span>
              </div>

              {tvDetails.status && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Status</span>
                  <span className="text-zinc-200 font-medium">{tvDetails.status}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Tv className="w-3 h-3 text-purple-400" />
                  <span>TV Series</span>
                </Badge>

                {tvDetails.genres?.map((g: string) => (
                  <Badge key={g} variant="outline">
                    {g}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
                {tvDetails.title}
              </h1>

              {tvDetails.tagline && (
                <p className="text-base italic text-purple-300">
                  &ldquo;{tvDetails.tagline}&rdquo;
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Synopsis
              </h3>
              <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                {tvDetails.overview || "No overview available."}
              </p>
            </div>

            <ExpandableCastGrid cast={tvDetails.cast} />
          </div>
        </section>

        {/* Similar TV Shows */}
        {tvDetails.similar && tvDetails.similar.length > 0 && (
          <MediaCarousel title="Similar Series You Might Like" items={tvDetails.similar} />
        )}
      </div>
    </div>
  );
}
