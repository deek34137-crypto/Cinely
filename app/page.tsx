import { tmdb } from "@/tmdb/api";
import { mapTmdbMovieToMediaItem, mapTmdbTvToMediaItem } from "@/lib/cards/mappers";
import { HeroBackground } from "@/components/hero/hero-background";
import { HeroContent } from "@/components/hero/hero-content";
import { MediaCarousel } from "@/components/media/media-carousel";
import Link from "next/link";
import { Sparkles, Film, Tv, Flame, Star, ShieldCheck } from "lucide-react";

export const revalidate = 3600;

export default async function HomePage() {
  let trendingMoviesRaw: any = { results: [] };
  let trendingTvRaw: any = { results: [] };
  let topRatedMoviesRaw: any = { results: [] };
  let popularAnimeRaw: any = { results: [] };

  try {
    const [moviesRes, tvRes, topRes, animeRes] = await Promise.allSettled([
      tmdb.movie.trending("week", "1"),
      tmdb.tv.trending("week", "1"),
      tmdb.movie.topRated("1"),
      tmdb.tv.discover({ with_genres: "16", sort_by: "popularity.desc" }),
    ]);

    if (moviesRes.status === "fulfilled") trendingMoviesRaw = moviesRes.value;
    if (tvRes.status === "fulfilled") trendingTvRaw = tvRes.value;
    if (topRes.status === "fulfilled") topRatedMoviesRaw = topRes.value;
    if (animeRes.status === "fulfilled") popularAnimeRaw = animeRes.value;
  } catch (err) {
    console.error("Failed to load home page catalogs:", err);
  }

  const trendingMovies = (trendingMoviesRaw.results || []).slice(0, 16).map(mapTmdbMovieToMediaItem);
  const trendingTv = (trendingTvRaw.results || []).slice(0, 16).map(mapTmdbTvToMediaItem);
  const topRatedMovies = (topRatedMoviesRaw.results || []).slice(0, 16).map(mapTmdbMovieToMediaItem);
  const popularAnime = (popularAnimeRaw.results || []).slice(0, 16).map(mapTmdbTvToMediaItem);

  const heroItem = trendingMovies[0] || {
    id: 27205,
    tmdbId: 27205,
    title: "Inception",
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life.",
    posterUrl: "https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2P1QiDKuh.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    mediaType: "movie",
    releaseDate: "2010-07-15",
    voteAverage: 8.4,
    voteCount: 35000,
    genres: ["Action", "Science Fiction", "Adventure"],
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Featured Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col justify-end">
        <HeroBackground backdropUrl={heroItem.backdropUrl} title={heroItem.title} />

        <div className="max-w-7xl mx-auto w-full">
          <HeroContent
            media={heroItem}
            onPlayClick={undefined}
          />
        </div>
      </section>

      {/* Feature Highlights Pill Bar */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-zinc-950/60 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Direct Stream Scraping</h4>
              <p className="text-[11px] text-zinc-400">Proxied HLS/DASH with SplitMix64 cipher decryption.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">14 Sandboxed Embeds</h4>
              <p className="text-[11px] text-zinc-400">VidSrc, VidKing, VidNest, SuperEmbed & 10 more.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Universal Discovery</h4>
              <p className="text-[11px] text-zinc-400">Instant cmdk search across TMDB and Anime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Media Carousels */}
      <div className="space-y-6 max-w-7xl mx-auto w-full py-6">
        <MediaCarousel
          title="Trending Movies"
          items={trendingMovies}
          actionLink="/movies/popular"
        />

        <MediaCarousel
          title="Popular TV Shows"
          items={trendingTv}
          actionLink="/tvshows/browse"
        />

        <MediaCarousel
          title="Top Anime Series"
          items={popularAnime}
          actionLink="/anime/browse"
        />

        <MediaCarousel
          title="Highest Rated Masterpieces"
          items={topRatedMovies}
          actionLink="/movies/top-rated"
        />
      </div>
    </div>
  );
}
