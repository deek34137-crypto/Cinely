import { tmdbImage } from "@/tmdb/utils";
import {
  TmdbMovieDetails,
  TmdbMovieItem,
  TmdbTvDetails,
  TmdbTvItem,
} from "@/tmdb/models";
import { CastMember, MediaItem, MovieDetails, Season, TvDetails, VideoTrailer } from "@/lib/domain/typings";

export function mapTmdbMovieToMediaItem(item: TmdbMovieItem): MediaItem {
  return {
    id: item.id,
    tmdbId: item.id,
    title: item.title || item.original_title || "Untitled Movie",
    originalTitle: item.original_title,
    overview: item.overview || "",
    posterUrl: tmdbImage.poster(item.poster_path),
    backdropUrl: tmdbImage.backdrop(item.backdrop_path),
    mediaType: "movie",
    releaseDate: item.release_date,
    voteAverage: item.vote_average,
    voteCount: item.vote_count,
    popularity: item.popularity,
  };
}

export function mapTmdbTvToMediaItem(item: TmdbTvItem): MediaItem {
  return {
    id: item.id,
    tmdbId: item.id,
    title: item.name || item.original_name || "Untitled Series",
    originalTitle: item.original_name,
    overview: item.overview || "",
    posterUrl: tmdbImage.poster(item.poster_path),
    backdropUrl: tmdbImage.backdrop(item.backdrop_path),
    mediaType: "tv",
    releaseDate: item.first_air_date,
    voteAverage: item.vote_average,
    voteCount: item.vote_count,
    popularity: item.popularity,
  };
}

export function mapTmdbAnimeToMediaItem(item: TmdbTvItem): MediaItem {
  return {
    id: item.id,
    tmdbId: item.id,
    title: item.name || item.original_name || "Untitled Anime",
    originalTitle: item.original_name,
    overview: item.overview || "",
    posterUrl: tmdbImage.poster(item.poster_path),
    backdropUrl: tmdbImage.backdrop(item.backdrop_path),
    mediaType: "anime",
    releaseDate: item.first_air_date,
    voteAverage: item.vote_average,
    voteCount: item.vote_count,
    popularity: item.popularity,
  };
}

export function mapTmdbMovieDetails(details: TmdbMovieDetails): MovieDetails {
  const cast: CastMember[] = (details.credits?.cast || []).slice(0, 18).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character || "",
    profileUrl: tmdbImage.profile(c.profile_path),
    order: c.order,
  }));

  const trailers: VideoTrailer[] = (details.videos?.results || [])
    .filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .map((v) => ({
      id: v.id,
      key: v.key,
      name: v.name,
      site: v.site,
      type: v.type,
    }));

  const similar: MediaItem[] = (details.similar?.results || []).slice(0, 12).map(mapTmdbMovieToMediaItem);
  const recommendations: MediaItem[] = (details.recommendations?.results || []).slice(0, 12).map(mapTmdbMovieToMediaItem);

  return {
    id: details.id,
    tmdbId: details.id,
    title: details.title || details.original_title || "Untitled",
    originalTitle: details.original_title,
    overview: details.overview || "",
    posterUrl: tmdbImage.poster(details.poster_path),
    backdropUrl: tmdbImage.backdrop(details.backdrop_path),
    mediaType: "movie",
    releaseDate: details.release_date,
    voteAverage: details.vote_average,
    voteCount: details.vote_count,
    genres: (details.genres || []).map((g) => g.name),
    runtime: details.runtime,
    tagline: details.tagline,
    imdbId: details.imdb_id,
    budget: details.budget,
    revenue: details.revenue,
    status: details.status,
    cast,
    trailers,
    similar,
    recommendations,
  };
}

export function mapTmdbTvDetails(details: TmdbTvDetails): TvDetails {
  const cast: CastMember[] = (details.credits?.cast || []).slice(0, 18).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character || "",
    profileUrl: tmdbImage.profile(c.profile_path),
    order: c.order,
  }));

  const trailers: VideoTrailer[] = (details.videos?.results || [])
    .filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .map((v) => ({
      id: v.id,
      key: v.key,
      name: v.name,
      site: v.site,
      type: v.type,
    }));

  const seasons: Season[] = (details.seasons || [])
    .filter((s) => s.season_number >= 0)
    .map((s) => ({
      id: s.id,
      seasonNumber: s.season_number,
      name: s.name,
      overview: s.overview || "",
      posterUrl: tmdbImage.poster(s.poster_path),
      episodeCount: s.episode_count,
      episodes: s.episodes?.map((e) => ({
        id: e.id,
        episodeNumber: e.episode_number,
        seasonNumber: e.season_number,
        title: e.name || `Episode ${e.episode_number}`,
        overview: e.overview || "",
        stillUrl: tmdbImage.still(e.still_path),
        airDate: e.air_date,
        runtime: e.runtime,
        voteAverage: e.vote_average,
      })),
    }));

  const similar: MediaItem[] = (details.similar?.results || []).slice(0, 12).map(mapTmdbTvToMediaItem);
  const recommendations: MediaItem[] = (details.recommendations?.results || []).slice(0, 12).map(mapTmdbTvToMediaItem);

  return {
    id: details.id,
    tmdbId: details.id,
    title: details.name || details.original_name || "Untitled Show",
    originalTitle: details.original_name,
    overview: details.overview || "",
    posterUrl: tmdbImage.poster(details.poster_path),
    backdropUrl: tmdbImage.backdrop(details.backdrop_path),
    mediaType: "tv",
    releaseDate: details.first_air_date,
    voteAverage: details.vote_average,
    voteCount: details.vote_count,
    genres: (details.genres || []).map((g) => g.name),
    numberOfSeasons: details.number_of_seasons,
    numberOfEpisodes: details.number_of_episodes,
    seasons,
    cast,
    trailers,
    similar,
    recommendations,
    status: details.status,
    tagline: details.tagline,
  };
}
