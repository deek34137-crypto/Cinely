import { tmdb } from "@/tmdb/api";
import { mapTmdbMovieDetails } from "@/lib/cards/mappers";
import { ScrapePlayerShell } from "@/components/media/scrape-player-shell";
import { ExpandableCastGrid } from "@/components/media/expandable-cast-grid";
import { MediaCarousel } from "@/components/media/media-carousel";
import { AmbientVideoBackdrop } from "@/components/hero/ambient-video-backdrop";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar, Clock, DollarSign, ExternalLink, Film } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export default async function MovieDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let movieDetails: any = null;

  try {
    const raw = await tmdb.movie.detail(id);
    movieDetails = mapTmdbMovieDetails(raw);
  } catch (error) {
    console.error(`Failed to load movie ${id}:`, error);
  }

  if (!movieDetails) {
    notFound();
  }

  const tmdbId = Number(movieDetails.tmdbId || movieDetails.id);
  const releaseYear = movieDetails.releaseDate
    ? new Date(movieDetails.releaseDate).getFullYear()
    : null;

  return (
    <div className="relative min-h-screen pb-20">
      <AmbientVideoBackdrop backdropUrl={movieDetails.backdropUrl} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-10">
        {/* Main Video Player Shell */}
        <section className="w-full">
          <ScrapePlayerShell
            tmdbId={tmdbId}
            mediaType="movie"
            title={movieDetails.title}
            poster={movieDetails.backdropUrl || movieDetails.posterUrl}
            imdbId={movieDetails.imdbId}
          />
        </section>

        {/* Movie Metadata & Overview Section */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Poster & Quick Stats */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="relative aspect-[2/3] w-48 sm:w-56 lg:w-full mx-auto overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 shadow-xl">
              <Image
                src={movieDetails.posterUrl}
                alt={movieDetails.title}
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
                  {movieDetails.voteAverage?.toFixed(1)} / 10
                </span>
              </div>

              {movieDetails.runtime && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Runtime</span>
                  <span className="text-zinc-200 font-medium">{movieDetails.runtime} minutes</span>
                </div>
              )}

              {releaseYear && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Release Year</span>
                  <span className="text-zinc-200 font-medium">{releaseYear}</span>
                </div>
              )}

              {movieDetails.status && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Status</span>
                  <span className="text-zinc-200 font-medium">{movieDetails.status}</span>
                </div>
              )}

              {movieDetails.imdbId && (
                <div className="flex justify-between items-center text-zinc-400 pt-2 border-t border-white/5">
                  <span>IMDb Reference</span>
                  <a
                    href={`https://www.imdb.com/title/${movieDetails.imdbId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline flex items-center gap-1"
                  >
                    {movieDetails.imdbId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Details, Tagline, Cast */}
          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="glow" className="flex items-center gap-1">
                  <Film className="w-3 h-3 text-purple-400" />
                  <span>Movie</span>
                </Badge>

                {movieDetails.genres?.map((g: string) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
                {movieDetails.title}
              </h1>

              {movieDetails.tagline && (
                <p className="text-base italic text-purple-300">
                  &ldquo;{movieDetails.tagline}&rdquo;
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Synopsis
              </h3>
              <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                {movieDetails.overview || "No overview available."}
              </p>
            </div>

            {/* Cast Grid */}
            <ExpandableCastGrid cast={movieDetails.cast} />
          </div>
        </section>

        {/* Similar & Recommendations Carousels */}
        {movieDetails.similar && movieDetails.similar.length > 0 && (
          <MediaCarousel title="Similar Movies You Might Like" items={movieDetails.similar} />
        )}

        {movieDetails.recommendations && movieDetails.recommendations.length > 0 && (
          <MediaCarousel title="Recommended For You" items={movieDetails.recommendations} />
        )}
      </div>
    </div>
  );
}
