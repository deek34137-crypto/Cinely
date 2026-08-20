import {
  NormalizedMediaDetail,
  NormalizedSeasonDetail,
  NormalizedEpisode
} from "../../core/types/media.js";
import { generateCanonicalId, generateEpisodeId } from "../../core/utils/id.js";

export interface TVMazeShowPayload {
  id: number;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  runtime?: number;
  premiered?: string;
  rating?: { average?: number };
  externals?: { imdb?: string; thetvdb?: number };
  image?: { medium?: string; original?: string };
  summary?: string;
  _embedded?: {
    episodes?: Array<{
      id: number;
      name: string;
      season: number;
      number: number;
      airdate?: string;
      runtime?: number;
      image?: { medium?: string; original?: string };
      summary?: string;
    }>;
    seasons?: Array<{
      id: number;
      number: number;
      name?: string;
      episodeOrder?: number;
      premiereDate?: string;
      image?: { medium?: string; original?: string };
      summary?: string;
    }>;
  };
}

export class TVMazeMetadataAdapter {
  /**
   * Normalizes TVMaze show into NormalizedMediaDetail.
   */
  normalizeShow(raw: TVMazeShowPayload): NormalizedMediaDetail {
    const imdbId = raw.externals?.imdb || null;
    const primaryId = imdbId || `tvmaze:${raw.id}`;
    const canonicalId = generateCanonicalId("series", primaryId);
    const releaseYear = raw.premiered ? parseInt(raw.premiered.split("-")[0], 10) : null;

    // Clean HTML tags from TVMaze summary
    const cleanOverview = raw.summary
      ? raw.summary.replace(/<[^>]*>?/gm, "").trim()
      : null;

    return {
      id: canonicalId,
      mediaKind: "series",
      originalTitle: raw.name,
      defaultTitle: raw.name,
      overview: cleanOverview,
      tagline: null,
      releaseDate: raw.premiered || null,
      releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
      runtimeMinutes: raw.runtime || null,
      certification: null,
      genres: raw.genres || [],
      artwork: {
        posterUrl: raw.image?.original || raw.image?.medium || null,
        backdropUrl: null,
        logoUrl: null,
        bannerUrl: null,
        thumbnailUrl: raw.image?.medium || null
      },
      trailerUrl: null,
      externalIds: {
        tvmazeId: String(raw.id),
        imdbId
      },
      rating: raw.rating?.average || null,
      popularityScore: (raw.rating?.average || 0) * 10,
      directors: [],
      writers: [],
      cast: [],
      seasonsCount: raw._embedded?.seasons?.length || 0,
      episodesCount: raw._embedded?.episodes?.length || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Normalizes embedded seasons and episodes from TVMaze.
   */
  normalizeSeasonsAndEpisodes(raw: TVMazeShowPayload): NormalizedSeasonDetail[] {
    const imdbId = raw.externals?.imdb || null;
    const primaryId = imdbId || `tvmaze:${raw.id}`;
    const seriesId = generateCanonicalId("series", primaryId);

    const episodesBySeason = new Map<number, NormalizedEpisode[]>();

    for (const ep of raw._embedded?.episodes || []) {
      const cleanEpOverview = ep.summary
        ? ep.summary.replace(/<[^>]*>?/gm, "").trim()
        : null;

      const episode: NormalizedEpisode = {
        id: generateEpisodeId(seriesId, ep.season, ep.number),
        seriesId,
        seasonNumber: ep.season,
        episodeNumber: ep.number,
        title: ep.name || `Episode ${ep.number}`,
        overview: cleanEpOverview,
        stillUrl: ep.image?.original || ep.image?.medium || null,
        airDate: ep.airdate || null,
        runtimeMinutes: ep.runtime || null,
        externalIds: {
          tvmazeId: String(ep.id)
        }
      };

      if (!episodesBySeason.has(ep.season)) {
        episodesBySeason.set(ep.season, []);
      }
      episodesBySeason.get(ep.season)!.push(episode);
    }

    const seasons: NormalizedSeasonDetail[] = [];
    const rawSeasons = raw._embedded?.seasons || [];

    if (rawSeasons.length > 0) {
      for (const s of rawSeasons) {
        const eps = episodesBySeason.get(s.number) || [];
        seasons.push({
          id: `${seriesId}:s${s.number}`,
          seriesId,
          seasonNumber: s.number,
          title: s.name || `Season ${s.number}`,
          overview: s.summary ? s.summary.replace(/<[^>]*>?/gm, "").trim() : null,
          posterUrl: s.image?.original || s.image?.medium || null,
          airDate: s.premiereDate || null,
          episodes: eps
        });
      }
    } else {
      // Build seasons dynamically from episodes map if raw seasons were not embedded
      for (const [seasonNum, eps] of episodesBySeason.entries()) {
        seasons.push({
          id: `${seriesId}:s${seasonNum}`,
          seriesId,
          seasonNumber: seasonNum,
          title: `Season ${seasonNum}`,
          overview: null,
          posterUrl: null,
          airDate: eps[0]?.airDate || null,
          episodes: eps
        });
      }
    }

    return seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
  }
}
