import { ScrapeStreamResult } from "../domain/typings";
import { tmdbScrapers } from "./providers";
import { animeScrapers } from "./anime";
import { createProxiedMediaUrl } from "./playback";
import { resolveTmdbToAnilist } from "../fribb-mapping";

export interface ScrapeRequestPayload {
  mediaKind?: "tmdb" | "anime";
  tmdbId?: number;
  mediaType?: "movie" | "tv";
  title?: string;
  season?: number;
  episode?: number;
  providerId?: string;
  dub?: boolean;
}

export interface ScrapeResponseData {
  success: boolean;
  providerId: string;
  providerName: string;
  playUrl: string;
  originalUrl: string;
  streamType: "hls" | "dash" | "mp4";
  subtitles?: Array<{ lang: string; url: string }>;
  audioTracks?: Array<{ lang: string; label: string; url?: string }>;
  duration?: number;
}

export async function handleScrapeRequest(
  payload: ScrapeRequestPayload
): Promise<ScrapeResponseData | null> {
  const {
    mediaKind = "tmdb",
    tmdbId,
    mediaType = "movie",
    title,
    season = 1,
    episode = 1,
    providerId,
    dub = false,
  } = payload;

  if (mediaKind === "anime" || (!tmdbId && title)) {
    // Resolve AniList ID from tmdbId or title
    const resolved = await resolveTmdbToAnilist(tmdbId, title);
    const targetQueryOrId = resolved.anilistId || resolved.title || title || (tmdbId ? `Anime ${tmdbId}` : "");

    const scrapersToRun = providerId
      ? animeScrapers.filter((s) => s.id === providerId || `anivexa-${s.id}` === providerId)
      : animeScrapers;

    for (const scraper of scrapersToRun) {
      try {
        const result = await scraper.scrape(targetQueryOrId, episode, dub);
        if (result && result.url) {
          const proxiedUrl = createProxiedMediaUrl(
            result.url,
            result.referer || "https://anivexa-stream-api.deek34137.workers.dev/",
            undefined,
            result.streamType === "hls" ? "stream.m3u8" : "manifest.mpd"
          );
          return {
            success: true,
            providerId: result.providerId,
            providerName: result.providerName,
            playUrl: proxiedUrl,
            originalUrl: result.url,
            streamType: result.streamType,
            subtitles: result.subtitles,
            audioTracks: result.audioTracks,
          };
        }
      } catch (err) {
        console.warn(`Anime scraper ${scraper.id} failed:`, err);
      }
    }
  }

  if (tmdbId) {
    const scrapersToRun = providerId
      ? tmdbScrapers.filter((s) => s.id === providerId)
      : tmdbScrapers;

    // Race the scrapers or try in priority order
    for (const scraper of scrapersToRun) {
      try {
        const result = await scraper.scrape(tmdbId, mediaType, season, episode);
        if (result && result.url) {
          const proxiedUrl = createProxiedMediaUrl(
            result.url,
            result.referer,
            undefined,
            result.streamType === "hls" ? "stream.m3u8" : "manifest.mpd"
          );
          return {
            success: true,
            providerId: result.providerId,
            providerName: result.providerName,
            playUrl: proxiedUrl,
            originalUrl: result.url,
            streamType: result.streamType,
            subtitles: result.subtitles,
            audioTracks: result.audioTracks,
          };
        }
      } catch (err) {
        console.warn(`TMDB Scraper ${scraper.id} failed:`, err);
      }
    }
  }

  return null;
}
