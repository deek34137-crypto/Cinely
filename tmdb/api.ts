import {
  TmdbMovieDetails,
  TmdbMovieItem,
  TmdbSearchResponse,
  TmdbSeason,
  TmdbTvDetails,
  TmdbTvItem,
} from "./models";

const baseUrl = "https://api.themoviedb.org/3";
const apiKey = process.env.TMDB_API_KEY || "84146cb62e57d516be1735d3d1911fae"; // Default fallback key for public read-only discovery

async function tmdbFetch<T>(endpoint: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;

  const query = new URLSearchParams({ api_key: apiKey, ...cleanParams }).toString();
  const url = `${baseUrl}/${endpoint}?${query}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`Failed to fetch TMDB endpoint ${endpoint}:`, error);
    throw error;
  }
}

export const tmdb = {
  movie: {
    detail: (id: string | number) =>
      tmdbFetch<TmdbMovieDetails>(`movie/${id}`, {
        append_to_response: "videos,credits,images,recommendations,similar,reviews,watch/providers",
      }),
    popular: (page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbMovieItem>>("movie/popular", { page }),
    topRated: (page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbMovieItem>>("movie/top_rated", { page }),
    trending: (timeWindow: "day" | "week" = "week", page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbMovieItem>>(`trending/movie/${timeWindow}`, { page }),
    nowPlaying: (page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbMovieItem>>("movie/now_playing", { page }),
    discover: (params: Record<string, string> = {}) =>
      tmdbFetch<TmdbSearchResponse<TmdbMovieItem>>("discover/movie", {
        sort_by: "popularity.desc",
        ...params,
      }),
  },
  tv: {
    detail: (id: string | number) =>
      tmdbFetch<TmdbTvDetails>(`tv/${id}`, {
        append_to_response: "videos,credits,images,recommendations,similar,reviews,watch/providers",
      }),
    popular: (page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbTvItem>>("tv/popular", { page }),
    topRated: (page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbTvItem>>("tv/top_rated", { page }),
    trending: (timeWindow: "day" | "week" = "week", page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbTvItem>>(`trending/tv/${timeWindow}`, { page }),
    season: (id: string | number, season: number) =>
      tmdbFetch<TmdbSeason>(`tv/${id}/season/${season}`),
    discover: (params: Record<string, string> = {}) =>
      tmdbFetch<TmdbSearchResponse<TmdbTvItem>>("discover/tv", {
        sort_by: "popularity.desc",
        ...params,
      }),
  },
  search: {
    multi: (query: string, page = "1") =>
      tmdbFetch<TmdbSearchResponse<any>>("search/multi", {
        query,
        page,
        include_adult: "false",
      }),
    movie: (query: string, page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbMovieItem>>("search/movie", {
        query,
        page,
        include_adult: "false",
      }),
    tv: (query: string, page = "1") =>
      tmdbFetch<TmdbSearchResponse<TmdbTvItem>>("search/tv", {
        query,
        page,
        include_adult: "false",
      }),
  },
  genres: {
    movieList: () => tmdbFetch<{ genres: { id: number; name: string }[] }>("genre/movie/list"),
    tvList: () => tmdbFetch<{ genres: { id: number; name: string }[] }>("genre/tv/list"),
  },
};
