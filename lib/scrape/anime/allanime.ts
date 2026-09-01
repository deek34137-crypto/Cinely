import { ScrapeStreamResult } from "../../domain/typings";
import { resolveTmdbToAnilist } from "../../fribb-mapping";
import { scrapeFetch } from "../fetch";

const ANIVEXA_BASE_URL = "https://anivexa-stream-api.deek34137.workers.dev";

export interface AnivexaWatchResponse {
  anime?: string;
  slug?: string;
  ep?: number;
  audio?: "sub" | "dub";
  server?: string;
  stream_url?: string;
  redirect_url?: string;
  streams?: Array<{
    url: string;
    type: string;
    server?: string;
  }>;
  subtitles?: Array<{
    url: string;
    language: string;
    format: string;
    default?: boolean;
  }>;
  intro?: {
    start: number;
    end: number;
    title?: string;
  } | null;
  outro?: {
    start: number;
    end: number;
    title?: string;
  } | null;
}

export async function scrapeAnivexaProvider(
  provider: string,
  providerDisplayName: string,
  queryOrId: string | number,
  episode = 1,
  dub = false
): Promise<ScrapeStreamResult | null> {
  try {
    let anilistId: number | undefined;

    if (typeof queryOrId === "number" && queryOrId > 0) {
      anilistId = queryOrId;
    } else if (typeof queryOrId === "string" && !isNaN(Number(queryOrId)) && Number(queryOrId) > 0) {
      anilistId = Number(queryOrId);
    } else {
      const resolved = await resolveTmdbToAnilist(undefined, String(queryOrId));
      anilistId = resolved.anilistId;
    }

    if (!anilistId) {
      console.warn(`[Anivexa] Could not resolve AniList ID for query: "${queryOrId}"`);
      return null;
    }

    const audioMode = dub ? "dub" : "sub";
    const epSlug = `${provider}-${episode}`;
    const watchUrl = `${ANIVEXA_BASE_URL}/watch/${provider}/${anilistId}/${audioMode}/${epSlug}`;

    const res = await scrapeFetch(watchUrl, {
      timeoutMs: 8000,
      retries: 1,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as AnivexaWatchResponse;

    let streamUrl = data.stream_url;
    let streamReferer = ANIVEXA_BASE_URL;

    if (!streamUrl && data.streams && data.streams.length > 0) {
      const hlsStream =
        data.streams.find((s) => s.type === "hls" || s.url?.includes(".m3u8")) ||
        data.streams[0];
      streamUrl = hlsStream?.url;
      if (hlsStream && (hlsStream as any).referer) {
        streamReferer = (hlsStream as any).referer;
      }
    }

    if (!streamUrl) {
      return null;
    }

    const subtitles = (data.subtitles || []).map((sub) => ({
      lang: sub.language || "English",
      url: sub.url,
    }));

    return {
      providerId: `anivexa-${provider}`,
      providerName: providerDisplayName,
      streamType: streamUrl.includes(".mpd") ? "dash" : "hls",
      url: streamUrl,
      referer: streamReferer,
      subtitles,
      audioTracks: [
        {
          lang: dub ? "en" : "ja",
          label: dub ? "English Dub" : "Japanese Audio",
        },
      ],
    };
  } catch (err: any) {
    console.warn(`[Anivexa] Provider ${provider} error:`, err?.message || err);
    return null;
  }
}

export const scrapeReAnime = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("reanime", "ReAnime Engine (HLS)", q, ep, dub);

export const scrapeAniKoto = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("anikoto", "AniKoto Cloud", q, ep, dub);

export const scrapeJustAnime = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("justanime", "JustAnime Fast", q, ep, dub);

export const scrapeKAA = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("kaa", "KickAssAnime HD", q, ep, dub);

export const scrapeAniBD = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("anibd", "AniBD Direct (Ecchi/OVA/18+)", q, ep, dub);

export const scrapeAniNeko = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("anineko", "AniNeko Stream", q, ep, dub);

export const scrapeHiAnime = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("hianime", "HiAnime Server", q, ep, dub);

export const scrapeAnimeGG = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("animegg", "AnimeGG Direct", q, ep, dub);

export const scrapeAnimeNoSub = (q: string | number, ep = 1, dub = false) =>
  scrapeAnivexaProvider("animenosub", "AnimeNoSub Raw", q, ep, dub);


