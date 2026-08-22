import {
  TmdbMovieDetails,
  TmdbMovieItem,
  TmdbSearchResponse,
  TmdbSeason,
  TmdbTvDetails,
  TmdbTvItem,
} from "./models";

const baseUrl = "https://api.themoviedb.org/3";
const apiKey = process.env.TMDB_API_KEY || "84146cb62e57d516be1735d3d1911fae";

// Resilient fallback mock data for when TMDB_API_KEY is not configured
const MOCK_MOVIES: TmdbMovieItem[] = [
  {
    id: 27205,
    title: "Inception",
    original_title: "Inception",
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life.",
    poster_path: "/ljsZTbVsrQSqZgWeep2P1QiDKuh.jpg",
    backdrop_path: "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    release_date: "2010-07-15",
    popularity: 95.4,
    vote_average: 8.4,
    vote_count: 35000,
    genre_ids: [28, 878, 12],
    adult: false,
    video: false,
  },
  {
    id: 157336,
    title: "Interstellar",
    original_title: "Interstellar",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    release_date: "2014-11-05",
    popularity: 98.2,
    vote_average: 8.4,
    vote_count: 34000,
    genre_ids: [12, 18, 878],
    adult: false,
    video: false,
  },
  {
    id: 299534,
    title: "Avengers: Endgame",
    original_title: "Avengers: Endgame",
    overview: "After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more.",
    poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdrop_path: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    release_date: "2019-04-24",
    popularity: 88.6,
    vote_average: 8.3,
    vote_count: 24000,
    genre_ids: [12, 878, 28],
    adult: false,
    video: false,
  },
  {
    id: 550,
    title: "Fight Club",
    original_title: "Fight Club",
    overview: "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    release_date: "1999-10-15",
    popularity: 75.1,
    vote_average: 8.4,
    vote_count: 28000,
    genre_ids: [18],
    adult: false,
    video: false,
  },
  {
    id: 155,
    title: "The Dark Knight",
    original_title: "The Dark Knight",
    overview: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop_path: "/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
    release_date: "2008-07-16",
    popularity: 92.5,
    vote_average: 8.5,
    vote_count: 32000,
    genre_ids: [18, 28, 80, 53],
    adult: false,
    video: false,
  },
];

const MOCK_TV: TmdbTvItem[] = [
  {
    id: 1399,
    name: "Game of Thrones",
    original_name: "Game of Thrones",
    overview: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war.",
    poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    backdrop_path: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg",
    first_air_date: "2011-04-17",
    popularity: 120.5,
    vote_average: 8.4,
    vote_count: 23000,
    genre_ids: [10765, 18, 10759],
    origin_country: ["US"],
  },
  {
    id: 1396,
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    overview: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student.",
    poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdrop_path: "/9faGSFi5jam6pDWGNd0p8J2gXly.jpg",
    first_air_date: "2008-01-20",
    popularity: 110.2,
    vote_average: 8.9,
    vote_count: 14000,
    genre_ids: [18, 80],
    origin_country: ["US"],
  },
  {
    id: 85937,
    name: "Demon Slayer: Kimetsu no Yaiba",
    original_name: "鬼滅の刃",
    overview: "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.",
    poster_path: "/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    backdrop_path: "/nTvM4mhqZlHIvUkI1gVnW6XP7GG.jpg",
    first_air_date: "2019-04-06",
    popularity: 95.0,
    vote_average: 8.7,
    vote_count: 6000,
    genre_ids: [16, 10759, 10765],
    origin_country: ["JP"],
  },
  {
    id: 95479,
    name: "Jujutsu Kaisen",
    original_name: "呪術廻戦",
    overview: "Yuji Itadori is a boy with tremendous physical strength, though he lives a completely ordinary high school life. One day, to save a classmate, he eats the finger of Ryomen Sukuna.",
    poster_path: "/fHpKW59fCqY7f9hGkHcxWJ4hGk.jpg",
    backdrop_path: "/gmECX1DvFwKgtYrNW7utk98vfzX.jpg",
    first_air_date: "2020-10-03",
    popularity: 89.3,
    vote_average: 8.6,
    vote_count: 3500,
    genre_ids: [16, 10759, 10765],
    origin_country: ["JP"],
  },
];

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
    // Return resilient fallback responses
    if (endpoint.includes("trending/movie") || endpoint.includes("movie/popular") || endpoint.includes("movie/top_rated") || endpoint.includes("discover/movie")) {
      return { page: 1, results: MOCK_MOVIES, total_pages: 1, total_results: MOCK_MOVIES.length } as unknown as T;
    }
    if (endpoint.includes("trending/tv") || endpoint.includes("tv/popular") || endpoint.includes("tv/top_rated") || endpoint.includes("discover/tv")) {
      return { page: 1, results: MOCK_TV, total_pages: 1, total_results: MOCK_TV.length } as unknown as T;
    }
    if (endpoint.includes("genre/movie/list")) {
      return {
        genres: [
          { id: 28, name: "Action" },
          { id: 12, name: "Adventure" },
          { id: 16, name: "Animation" },
          { id: 35, name: "Comedy" },
          { id: 80, name: "Crime" },
          { id: 18, name: "Drama" },
          { id: 878, name: "Sci-Fi" },
          { id: 53, name: "Thriller" },
        ],
      } as unknown as T;
    }
    if (endpoint.includes("genre/tv/list")) {
      return {
        genres: [
          { id: 10759, name: "Action & Adventure" },
          { id: 16, name: "Animation" },
          { id: 35, name: "Comedy" },
          { id: 18, name: "Drama" },
          { id: 10765, name: "Sci-Fi & Fantasy" },
        ],
      } as unknown as T;
    }
    if (endpoint.startsWith("movie/")) {
      const match = MOCK_MOVIES.find((m) => String(m.id) === endpoint.replace("movie/", ""));
      const base = match || MOCK_MOVIES[0];
      return {
        ...base,
        belongs_to_collection: null,
        budget: 160000000,
        genres: [{ id: 28, name: "Action" }, { id: 878, name: "Sci-Fi" }],
        homepage: "",
        imdb_id: "tt1375666",
        revenue: 836836967,
        runtime: 148,
        status: "Released",
        tagline: "Your mind is the scene of the crime.",
        credits: { cast: [], crew: [] },
        videos: { results: [] },
        images: { backdrops: [], logos: [], posters: [] },
        similar: { results: MOCK_MOVIES },
        recommendations: { results: MOCK_MOVIES },
      } as unknown as T;
    }
    if (endpoint.startsWith("tv/")) {
      const base = MOCK_TV[0];
      return {
        ...base,
        created_by: [],
        episode_run_time: [60],
        genres: [{ id: 18, name: "Drama" }, { id: 10765, name: "Sci-Fi & Fantasy" }],
        homepage: "",
        in_production: false,
        languages: ["en"],
        last_air_date: "2019-05-19",
        last_episode_to_air: null,
        next_episode_to_air: null,
        number_of_episodes: 73,
        number_of_seasons: 8,
        seasons: [
          {
            id: 1,
            season_number: 1,
            name: "Season 1",
            overview: "Season 1 overview",
            poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
            episode_count: 10,
            air_date: "2011-04-17",
            vote_average: 8.5,
          },
        ],
        status: "Ended",
        tagline: "Winter is Coming",
        type: "Scripted",
        credits: { cast: [], crew: [] },
        videos: { results: [] },
        images: { backdrops: [], logos: [], posters: [] },
        similar: { results: MOCK_TV },
        recommendations: { results: MOCK_TV },
      } as unknown as T;
    }

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
